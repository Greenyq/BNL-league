/**
 * Warcraft 3 Frozen Throne - Ice Effect
 * Creates frozen button effect with ice shattering animation on click
 */

class IceEffect {
    constructor() {
        // Don't auto-init, wait for React to call applyIceEffect
    }

    applyIceEffect() {
        // Apply ice effect to all navigation buttons
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(button => {
            // Add ice-frozen class
            button.classList.add('ice-frozen');

            // Add frost particles
            this.addFrostParticles(button);

            // Add ice crack container
            const crackContainer = document.createElement('div');
            crackContainer.className = 'ice-crack-container';
            button.appendChild(crackContainer);

            // Add click handler
            button.addEventListener('click', (e) => this.shatterIce(e, button));
        });
    }

    addFrostParticles(element) {
        // Create 5-8 random frost particles
        const particleCount = Math.floor(Math.random() * 4) + 5;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'frost-particle';

            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;

            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 4}s`;

            element.appendChild(particle);
        }
    }

    shatterIce(event, button) {
        // Prevent multiple simultaneous shatters
        if (button.classList.contains('ice-shattering')) {
            return;
        }

        // Get click position relative to button
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Add shattering class
        button.classList.add('ice-shattering');

        // Create ice cracks
        this.createIceCracks(button, x, y);

        // Create ice shards
        this.createIceShards(button, x, y);

        // Remove ice effect after animation
        setTimeout(() => {
            button.classList.remove('ice-frozen');
            button.classList.remove('ice-shattering');

            // Re-apply ice effect after a delay
            setTimeout(() => {
                button.classList.add('ice-frozen');
            }, 2000);
        }, 600);
    }

    createIceCracks(button, clickX, clickY) {
        const crackContainer = button.querySelector('.ice-crack-container');
        if (!crackContainer) return;

        // Create 8-12 cracks radiating from click point
        const crackCount = Math.floor(Math.random() * 5) + 8;

        for (let i = 0; i < crackCount; i++) {
            const crack = document.createElement('div');
            crack.className = 'ice-crack';

            // Random angle
            const angle = (360 / crackCount) * i + (Math.random() - 0.5) * 30;

            // Position at click point
            crack.style.left = `${clickX}px`;
            crack.style.top = `${clickY}px`;
            crack.style.height = `${Math.random() * 2 + 1}px`;
            crack.style.transform = `rotate(${angle}deg)`;

            // Random animation delay for cascading effect
            crack.style.animationDelay = `${Math.random() * 0.1}s`;

            crackContainer.appendChild(crack);

            // Remove after animation
            setTimeout(() => crack.remove(), 500);
        }
    }

    createIceShards(button, clickX, clickY) {
        // Create 15-25 ice shards flying outward
        const shardCount = Math.floor(Math.random() * 11) + 15;

        for (let i = 0; i < shardCount; i++) {
            const shard = document.createElement('div');
            shard.className = 'ice-shard';

            // Random size variation
            const size = Math.random() * 6 + 4;
            shard.style.width = `${size}px`;
            shard.style.height = `${size}px`;

            // Position at click point
            shard.style.left = `${clickX}px`;
            shard.style.top = `${clickY}px`;

            // Random direction and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const rotation = Math.random() * 720 - 360;

            // Set CSS custom properties for animation
            shard.style.setProperty('--tx', `${tx}px`);
            shard.style.setProperty('--ty', `${ty}px`);
            shard.style.setProperty('--rot', `${rotation}deg`);

            // Random animation delay
            shard.style.animationDelay = `${Math.random() * 0.1}s`;

            button.appendChild(shard);

            // Remove after animation
            setTimeout(() => shard.remove(), 900);
        }
    }

    // Method to manually apply ice to specific elements
    applyToElement(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('ice-frozen');
            this.addFrostParticles(element);

            const crackContainer = document.createElement('div');
            crackContainer.className = 'ice-crack-container';
            element.appendChild(crackContainer);

            element.addEventListener('click', (e) => this.shatterIce(e, element));
        });
    }

    // Method to remove ice from specific elements
    removeFromElement(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.remove('ice-frozen');
            element.classList.remove('ice-shattering');
        });
    }
}

// Initialize ice effect
const iceEffect = new IceEffect();

// Make it globally accessible for manual control
window.iceEffect = iceEffect;
