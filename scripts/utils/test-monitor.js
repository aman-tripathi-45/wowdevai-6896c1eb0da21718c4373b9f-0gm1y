/**
 * Advanced test monitoring system with AI-powered behavior detection
 */

export class TestMonitor {
  constructor(options = {}) {
    this.options = {
      enableCameraMonitoring: true,
      enableTabSwitchDetection: true,
      enableFullscreenMonitoring: true,
      enableKeyboardMonitoring: true,
      onViolation: () => {},
      onCameraError: () => {},
      ...options
    };
    
    this.isActive = false;
    this.violations = [];
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.faceDetectionModel = null;
    this.lastFacePosition = null;
    this.alertThreshold = 3; // Number of violations before auto-submit
  }

  async initialize() {
    try {
      // Request camera permissions
      if (this.options.enableCameraMonitoring) {
        await this.setupCamera();
        await this.loadFaceDetection();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize test monitor:', error);
      this.options.onCameraError(error);
      return false;
    }
  }

  async setupCamera() {
    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      // Create video element
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.style.display = 'none';
      document.body.appendChild(this.video);

      // Create canvas for face detection
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.context = this.canvas.getContext('2d');
      
      return true;
    } catch (error) {
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }

  async loadFaceDetection() {
    // Simplified face detection using browser APIs
    // In production, you would integrate with TensorFlow.js or similar
    if ('FaceDetector' in window) {
      this.faceDetectionModel = new FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1
      });
    } else {
      // Fallback to basic image analysis
      console.warn('Face detection API not available, using fallback method');
    }
  }

  setupEventListeners() {
    if (this.options.enableTabSwitchDetection) {
      // Detect tab switching and window focus changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isActive) {
          this.recordViolation('Tab switch detected');
        }
      });

      window.addEventListener('blur', () => {
        if (this.isActive) {
          this.recordViolation('Window lost focus');
        }
      });
    }

    if (this.options.enableFullscreenMonitoring) {
      // Monitor fullscreen changes
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && this.isActive) {
          this.recordViolation('Exited fullscreen mode');
        }
      });
    }

    if (this.options.enableKeyboardMonitoring) {
      // Monitor key presses
      document.addEventListener('keydown', (event) => {
        if (!this.isActive) return;
        
        // Block certain key combinations
        const blockedKeys = ['Escape', 'F11', 'F12', 'PrintScreen'];
        const blockedCombos = [
          event.ctrlKey && event.key === 'c', // Ctrl+C
          event.ctrlKey && event.key === 'v', // Ctrl+V
          event.ctrlKey && event.shiftKey && event.key === 'I', // Ctrl+Shift+I
          event.altKey && event.key === 'Tab' // Alt+Tab
        ];

        if (blockedKeys.includes(event.key) || blockedCombos.some(combo => combo)) {
          event.preventDefault();
          this.recordViolation(`Blocked key pressed: ${event.key}`);
        }
      });
    }

    // Context menu blocking
    document.addEventListener('contextmenu', (event) => {
      if (this.isActive) {
        event.preventDefault();
        this.recordViolation('Right-click attempted');
      }
    });

    // Text selection blocking
    document.addEventListener('selectstart', (event) => {
      if (this.isActive) {
        event.preventDefault();
      }
    });
  }

  startMonitoring() {
    this.isActive = true;
    this.violations = [];
    
    // Start camera monitoring
    if (this.options.enableCameraMonitoring && this.video) {
      this.startCameraAnalysis();
    }
    
    // Force fullscreen
    if (this.options.enableFullscreenMonitoring) {
      this.enterFullscreen();
    }
    
    console.log('Test monitoring started');
  }

  stopMonitoring() {
    this.isActive = false;
    
    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Remove video elements
    if (this.video) {
      this.video.remove();
    }
    
    console.log('Test monitoring stopped');
  }

  async startCameraAnalysis() {
    if (!this.isActive || !this.video) return;

    // Capture frame
    this.context.drawImage(this.video, 0, 0, 640, 480);
    const imageData = this.context.getImageData(0, 0, 640, 480);

    try {
      // Perform face detection
      await this.analyzeFacePosition(imageData);
    } catch (error) {
      console.error('Face detection error:', error);
    }

    // Continue monitoring
    if (this.isActive) {
      setTimeout(() => this.startCameraAnalysis(), 1000); // Check every second
    }
  }

  async analyzeFacePosition(imageData) {
    if (this.faceDetectionModel) {
      // Use Face Detection API if available
      try {
        const faces = await this.faceDetectionModel.detect(this.canvas);
        
        if (faces.length === 0) {
          this.recordViolation('No face detected - looking away');
          return;
        }

        const face = faces[0];
        const currentPosition = {
          x: face.boundingBox.x + face.boundingBox.width / 2,
          y: face.boundingBox.y + face.boundingBox.height / 2
        };

        // Check for significant head movement
        if (this.lastFacePosition) {
          const deltaX = Math.abs(currentPosition.x - this.lastFacePosition.x);
          const deltaY = Math.abs(currentPosition.y - this.lastFacePosition.y);
          
          if (deltaX > 100 || deltaY > 50) {
            this.recordViolation('Suspicious head movement detected');
          }
        }

        this.lastFacePosition = currentPosition;
      } catch (error) {
        console.error('Face detection failed:', error);
      }
    } else {
      // Fallback: Simple brightness analysis to detect presence
      const pixels = imageData.data;
      let brightness = 0;
      
      for (let i = 0; i < pixels.length; i += 4) {
        brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      
      brightness /= (pixels.length / 4);
      
      // If brightness changes significantly, assume movement
      if (this.lastBrightness && Math.abs(brightness - this.lastBrightness) > 20) {
        this.recordViolation('Significant movement detected');
      }
      
      this.lastBrightness = brightness;
    }
  }

  recordViolation(type) {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      severity: this.getViolationSeverity(type)
    };
    
    this.violations.push(violation);
    console.warn('Test violation:', violation);
    
    // Trigger callback
    this.options.onViolation(violation, this.violations);
    
    // Auto-submit if threshold reached
    if (this.violations.length >= this.alertThreshold) {
      this.triggerAutoSubmit();
    }
  }

  getViolationSeverity(type) {
    const highSeverity = ['Tab switch detected', 'Exited fullscreen mode', 'Window lost focus'];
    const mediumSeverity = ['No face detected', 'Suspicious head movement'];
    
    if (highSeverity.some(violation => type.includes(violation))) return 'high';
    if (mediumSeverity.some(violation => type.includes(violation))) return 'medium';
    return 'low';
  }

  triggerAutoSubmit() {
    console.warn('Multiple violations detected - triggering auto-submit');
    
    // Create and dispatch custom event
    const autoSubmitEvent = new CustomEvent('testAutoSubmit', {
      detail: {
        reason: 'Multiple violations detected',
        violations: this.violations
      }
    });
    
    document.dispatchEvent(autoSubmitEvent);
  }

  enterFullscreen() {
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  getViolationSummary() {
    return {
      total: this.violations.length,
      byType: this.violations.reduce((acc, violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: this.violations.reduce((acc, violation) => {
        acc[violation.severity] = (acc[violation.severity] || 0) + 1;
        return acc;
      }, {}),
      violations: this.violations
    };
  }
}