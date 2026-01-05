package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Global variables
var mongoClient *mongo.Client
var db *mongo.Database

// Request/Response structures
type ComputeStatsRequest struct {
	Players []PlayerData `json:"players"`
}

type PlayerData struct {
	BattleTag  string        `json:"battleTag"`
	MatchData  []MatchData   `json:"matchData"`
	CurrentMMR int           `json:"currentMmr"`
	Name       string        `json:"name"`
}

type MatchData struct {
	StartTime  time.Time     `json:"startTime"`
	GameMode   int           `json:"gameMode"`
	Teams      []TeamData    `json:"teams"`
}

type TeamData struct {
	Won     bool         `json:"won"`
	Players []PlayerInfo `json:"players"`
}

type PlayerInfo struct {
	BattleTag   string `json:"battleTag"`
	Race        int    `json:"race"`
	OldMMR      int    `json:"oldMmr"`
	CurrentMMR  int    `json:"currentMmr"`
}

type StatResult struct {
	BattleTag   string `bson:"battleTag" json:"battleTag"`
	Wins        int    `bson:"wins" json:"wins"`
	Losses      int    `bson:"losses" json:"losses"`
	Points      int    `bson:"points" json:"points"`
	MMR         int    `bson:"mmr" json:"mmr"`
	Achievements []string `bson:"achievements" json:"achievements"`
	RaceProfiles []RaceProfile `bson:"raceProfiles" json:"raceProfiles"`
	LastUpdated time.Time `bson:"lastUpdated" json:"lastUpdated"`
}

type RaceProfile struct {
	Race  int    `json:"race"`
	Wins  int    `json:"wins"`
	Losses int   `json:"losses"`
	Points int   `json:"points"`
	MMR   int    `json:"mmr"`
}

type ComputeStatsResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	Results []StatResult `json:"results"`
	Time    int64        `json:"processingTimeMs"`
}

func init() {
	// Initialize MongoDB connection
	mongoURL := os.Getenv("MONGO_URL")
	if mongoURL == "" {
		mongoURL = "mongodb://localhost:27017"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURL))
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}

	// Ping to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("❌ Failed to ping MongoDB: %v", err)
	}

	mongoClient = client
	db = client.Database("gnl_league")
	log.Println("✅ Connected to MongoDB")
}

func main() {
	defer mongoClient.Disconnect(context.Background())

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/compute-stats", computeStatsHandler)

	port := ":3001"
	log.Printf("🚀 Go Stats Processor running on %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"service": "go-stats-processor",
	})
}

// Main endpoint for stats computation
func computeStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	startTime := time.Now()
	w.Header().Set("Content-Type", "application/json")

	var req ComputeStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ JSON decode error: %v", err)
		response := ComputeStatsResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid JSON: %v", err),
			Results: []StatResult{},
			Time:    time.Since(startTime).Milliseconds(),
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	if len(req.Players) == 0 {
		log.Printf("⚠️ No players to process")
		response := ComputeStatsResponse{
			Success: true,
			Message: "No players provided",
			Results: []StatResult{},
			Time:    0,
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	log.Printf("⏱️ Processing %d players...", len(req.Players))

	// Process players in parallel using goroutines
	results := processPlayersParallel(req.Players)

	// Save results to MongoDB with timeout
	cacheDuration := 10 * time.Minute
	cacheCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := cacheResultsWithContext(cacheCtx, results, cacheDuration); err != nil {
		log.Printf("⚠️ Warning: Failed to cache results: %v", err)
		// Don't fail the request if caching fails
	}

	processingTime := time.Since(startTime).Milliseconds()

	response := ComputeStatsResponse{
		Success: true,
		Message: fmt.Sprintf("Processed %d players", len(results)),
		Results: results,
		Time:    processingTime,
	}

	json.NewEncoder(w).Encode(response)
	log.Printf("✅ Processed %d players in %dms", len(results), processingTime)
}

// Process multiple players in parallel
func processPlayersParallel(players []PlayerData) []StatResult {
	results := make([]StatResult, 0, len(players))
	resultsChan := make(chan StatResult, len(players))
	var wg sync.WaitGroup

	// Process each player in a separate goroutine
	for _, player := range players {
		wg.Add(1)
		go func(p PlayerData) {
			defer wg.Done()
			result := processPlayerMatches(p)
			resultsChan <- result
		}(player)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	// Collect results
	for result := range resultsChan {
		results = append(results, result)
	}

	return results
}

// Process matches for a single player
func processPlayerMatches(player PlayerData) StatResult {
	cutoffDate := time.Date(2025, 11, 27, 0, 0, 0, 0, time.UTC)

	// Filter recent matches
	var recentMatches []MatchData
	for _, match := range player.MatchData {
		if match.StartTime.After(cutoffDate) && match.GameMode == 1 {
			recentMatches = append(recentMatches, match)
		}
	}

	result := StatResult{
		BattleTag:   player.BattleTag,
		RaceProfiles: make([]RaceProfile, 0),
		LastUpdated: time.Now(),
	}

	if len(recentMatches) == 0 {
		return result
	}

	// Group matches by race
	matchesByRace := make(map[int][]MatchData)
	mmrByRace := make(map[int]int)

	for _, match := range recentMatches {
		if len(match.Teams) < 2 {
			continue
		}

		// Find player's team
		var playerTeam *TeamData
		var playerInfo *PlayerInfo

		for i := range match.Teams {
			for j := range match.Teams[i].Players {
				if match.Teams[i].Players[j].BattleTag == player.BattleTag {
					playerTeam = &match.Teams[i]
					playerInfo = &match.Teams[i].Players[j]
					break
				}
			}
			if playerTeam != nil {
				break
			}
		}

		if playerTeam == nil || playerInfo == nil || playerInfo.Race == 0 {
			continue
		}

		race := playerInfo.Race
		matchesByRace[race] = append(matchesByRace[race], match)
		if playerInfo.CurrentMMR > 0 {
			mmrByRace[race] = playerInfo.CurrentMMR
		}
	}

	// Calculate stats for each race
	for race, raceMatches := range matchesByRace {
		wins, losses, points := calculateRaceStats(player.BattleTag, raceMatches)

		result.RaceProfiles = append(result.RaceProfiles, RaceProfile{
			Race:   race,
			Wins:   wins,
			Losses: losses,
			Points: points,
			MMR:    mmrByRace[race],
		})

		// Update total stats
		result.Wins += wins
		result.Losses += losses
		result.Points += points
	}

	// Set MMR to highest race MMR
	for _, profile := range result.RaceProfiles {
		if profile.MMR > result.MMR {
			result.MMR = profile.MMR
		}
	}

	// Simple achievements (can be expanded)
	if result.Wins >= 100 {
		result.Achievements = append(result.Achievements, "centurion")
	}
	if result.Wins >= 50 {
		result.Achievements = append(result.Achievements, "warrior")
	}
	if result.Points >= 1000 {
		result.Achievements = append(result.Achievements, "goldRush")
	}

	return result
}

// Calculate stats for a specific race
func calculateRaceStats(battleTag string, matches []MatchData) (wins, losses, points int) {
	for _, match := range matches {
		if len(match.Teams) < 2 {
			continue
		}

		var playerTeam *TeamData
		var playerInfo *PlayerInfo
		var opponentInfo *PlayerInfo

		// Find player and opponent
		for i := range match.Teams {
			for j := range match.Teams[i].Players {
				if match.Teams[i].Players[j].BattleTag == battleTag {
					playerTeam = &match.Teams[i]
					playerInfo = &match.Teams[i].Players[j]
					break
				}
			}
		}

		if playerTeam == nil || playerInfo == nil {
			continue
		}

		// Get opponent
		for i := range match.Teams {
			if &match.Teams[i] != playerTeam && len(match.Teams[i].Players) > 0 {
				opponentInfo = &match.Teams[i].Players[0]
				break
			}
		}

		if opponentInfo == nil {
			continue
		}

		playerMMR := playerInfo.OldMMR
		if playerMMR == 0 {
			playerMMR = playerInfo.CurrentMMR
		}
		if playerMMR == 0 {
			playerMMR = 1500
		}

		opponentMMR := opponentInfo.OldMMR
		if opponentMMR == 0 {
			opponentMMR = opponentInfo.CurrentMMR
		}
		if opponentMMR == 0 {
			opponentMMR = 1500
		}

		mmrDiff := opponentMMR - playerMMR

		if playerTeam.Won {
			wins++
			if mmrDiff >= 20 {
				points += 70 // Win vs stronger
			} else if mmrDiff >= -19 {
				points += 50 // Win vs equal
			} else {
				points += 30 // Win vs weaker
			}
		} else {
			losses++
			if mmrDiff <= -20 {
				points -= 70 // Loss to weaker
			} else if mmrDiff >= -19 && mmrDiff <= 19 {
				points -= 50 // Loss to equal
			} else {
				points -= 30 // Loss to stronger
			}
		}
	}

	return
}

// Cache results in MongoDB with context
func cacheResultsWithContext(ctx context.Context, results []StatResult, duration time.Duration) error {
	collection := db.Collection("playerstats_cache")

	if len(results) == 0 {
		return nil
	}

	// Create a channel for results
	errChan := make(chan error, len(results))
	var wg sync.WaitGroup

	for _, result := range results {
		wg.Add(1)
		go func(r StatResult) {
			defer wg.Done()

			filter := bson.M{"battleTag": r.BattleTag}
			update := bson.M{
				"$set": bson.M{
					"battleTag":    r.BattleTag,
					"wins":         r.Wins,
					"losses":       r.Losses,
					"points":       r.Points,
					"mmr":          r.MMR,
					"achievements": r.Achievements,
					"raceProfiles": r.RaceProfiles,
					"lastUpdated":  r.LastUpdated,
					"expiresAt":    time.Now().Add(duration),
				},
			}

			opts := options.Update().SetUpsert(true)
			_, err := collection.UpdateOne(ctx, filter, update, opts)
			if err != nil {
				errChan <- fmt.Errorf("failed to cache %s: %w", r.BattleTag, err)
				log.Printf("⚠️ Cache error for %s: %v", r.BattleTag, err)
			}
		}(result)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(errChan)
	}()

	// Collect any errors (but don't fail on them)
	errorCount := 0
	for err := range errChan {
		if err != nil {
			errorCount++
		}
	}

	if errorCount > 0 {
		log.Printf("⚠️ %d cache errors occurred (out of %d players)", errorCount, len(results))
		// Don't return error - cache failures shouldn't block response
	} else {
		log.Printf("✅ Cached %d player stats successfully", len(results))
	}

	return nil
}

// Cache results in MongoDB (deprecated - use cacheResultsWithContext)
func cacheResults(results []StatResult, duration time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return cacheResultsWithContext(ctx, results, duration)
}
