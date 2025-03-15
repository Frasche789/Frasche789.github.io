/**
 * animationUtils.js - Animation utilities for Quest Board
 * Handles completion and celebration animations for positive reinforcement
 */

// Create confetti effect for celebrations
export function createConfetti() {
  const confettiContainer = document.getElementById('confetti') || document.body;
  const colors = ['#4361ee', '#4895ef', '#f72585', '#4cc9f0', '#3a0ca3'];
  const confettiCount = 150;
  const gravity = 0.5;
  const terminalVelocity = 5;
  const drag = 0.075;
  
  // Create confetti pieces
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.position = 'absolute';
    confetti.style.zIndex = '100';
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = `${Math.random() * 5 + 3}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.opacity = Math.random() + 0.5;
    confetti.style.borderRadius = '2px';
    confetti.style.pointerEvents = 'none';
    
    // Initial position - centered horizontally, from the top
    const startPositionX = confettiContainer.offsetWidth / 2;
    const startPositionY = -20;
    
    // Random initial velocity
    const velocityX = (Math.random() * 2 - 1) * 15;
    const velocityY = (Math.random() * 2 + 2) * 5;
    
    confetti.style.left = `${startPositionX}px`;
    confetti.style.top = `${startPositionY}px`;
    
    // Append to container
    confettiContainer.appendChild(confetti);
    
    // Animate the confetti piece
    const maxHeight = confettiContainer.offsetHeight;
    let positionX = startPositionX;
    let positionY = startPositionY;
    let currentVelocityX = velocityX;
    let currentVelocityY = velocityY;
    let rotation = 0;
    
    // Animation loop
    const animate = () => {
      // Update position
      positionX += currentVelocityX;
      positionY += currentVelocityY;
      
      // Apply gravity
      currentVelocityY += gravity;
      
      // Apply drag
      currentVelocityX *= (1 - drag);
      
      // Terminal velocity (don't accelerate forever)
      if (currentVelocityY > terminalVelocity) {
        currentVelocityY = terminalVelocity;
      }
      
      // Add some rotation
      rotation += Math.random() * 10;
      
      // Update confetti position
      confetti.style.transform = `translate(${currentVelocityX}px, ${currentVelocityY}px) rotate(${rotation}deg)`;
      confetti.style.left = `${positionX}px`;
      confetti.style.top = `${positionY}px`;
      
      // Stop animation when confetti is out of view
      if (positionY < maxHeight) {
        requestAnimationFrame(animate);
      } else {
        // Remove the confetti element after animation is done
        setTimeout(() => {
          confetti.remove();
        }, 100);
      }
    };
    
    // Start animation with a slight stagger
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, Math.random() * 500);
  }
}

// Play completion animation on a task element
export async function playCompletionAnimation(element) {
  return new Promise((resolve) => {
    // Clone the element to keep the original in the DOM
    const elementRect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    
    // Style the clone for animation
    clone.style.position = 'fixed';
    clone.style.left = `${elementRect.left}px`;
    clone.style.top = `${elementRect.top}px`;
    clone.style.width = `${elementRect.width}px`;
    clone.style.height = `${elementRect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '1000';
    clone.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    clone.style.pointerEvents = 'none'; // Prevent interaction with the clone
    
    // Append to body
    document.body.appendChild(clone);
    
    // Add completed styling to original element
    element.classList.add('completed-quest');
    
    // Create and add completion stamp
    const stamp = document.createElement('div');
    stamp.className = 'completed-stamp';
    stamp.textContent = 'DONE';
    element.appendChild(stamp);
    
    // Force reflow to ensure animation works
    void clone.offsetWidth;
    
    // Start animation
    clone.style.transform = 'scale(1.05)';
    clone.style.opacity = '0';
    
    // Clean up after animation
    setTimeout(() => {
      clone.remove();
      resolve();
    }, 500);
  });
}

// Add bounce animation to an element
export function addBounceEffect(element) {
  element.classList.add('bounce');
  setTimeout(() => {
    element.classList.remove('bounce');
  }, 1000);
}

// Apply a pulse effect to celebrate an achievement
export function celebratePulse(element) {
  element.classList.add('celebrate-pulse');
  setTimeout(() => {
    element.classList.remove('celebrate-pulse');
  }, 1500);
}

// Initialize animation styles
export function initAnimationStyles() {
  // Check if styles already exist
  if (document.getElementById('animation-styles')) {
    return;
  }
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'animation-styles';
  styleSheet.textContent = `
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
      40% {transform: translateY(-20px);}
      60% {transform: translateY(-10px);}
    }
    
    .bounce {
      animation: bounce 1s ease;
    }
    
    @keyframes celebratePulse {
      0% {transform: scale(1);}
      25% {transform: scale(1.1);}
      50% {transform: scale(1);}
      75% {transform: scale(1.05);}
      100% {transform: scale(1);}
    }
    
    .celebrate-pulse {
      animation: celebratePulse 1.5s ease;
    }
  `;
  document.head.appendChild(styleSheet);
}
