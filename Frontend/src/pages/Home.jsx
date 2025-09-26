import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../pages/AuthContext";

const HomePage = () => {
  const { user } = useAuth();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef(null);

  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Voices",
      description:
        "Experience lifelike speech synthesis powered by advanced neural networks",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: "⚡",
      title: "Real-time Processing",
      description:
        "Convert text to speech instantly with our optimized processing engine",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: "🌍",
      title: "Multi-Language Support",
      description:
        "Generate speech in multiple languages with authentic accents",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: "🎛️",
      title: "Advanced Controls",
      description: "Fine-tune voice parameters like speed, pitch, and emotion",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  const stats = [
    { number: "10K+", label: "Voices Generated" },
    { number: "50+", label: "Languages Supported" },
    { number: "99.9%", label: "Uptime Reliability" },
    { number: "⚡", label: "Instant Processing" },
  ];

  useEffect(() => {
    setIsVisible(true);

    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Enhanced particle system with more variety
    const particles = [];
    const particleCount = 80;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.color = this.getColor();
        this.type = Math.random() > 0.7 ? "star" : "particle";
      }

      getColor() {
        const colors = [
          "hsl(270, 100%, 70%)", // Bright purple
          "hsl(320, 100%, 70%)", // Bright pink
          "hsl(190, 100%, 70%)", // Bright cyan
          "hsl(220, 100%, 70%)", // Bright blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;

        // Pulsing effect for stars
        if (this.type === "star") {
          this.size = 2 + Math.sin(Date.now() * 0.001 + this.x) * 1.5;
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === "star") {
          // Draw star shape
          ctx.fillStyle = this.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = this.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const x2 = this.x + this.size * Math.cos(angle);
            const y2 = this.y + this.size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x2, y2);
            else ctx.lineTo(x2, y2);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw glowing particle
          ctx.fillStyle = this.color;
          ctx.shadowBlur = 20;
          ctx.shadowColor = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Create connection lines between particles
    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      // Enhanced background gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width,
      );
      gradient.addColorStop(0, "rgba(15, 10, 35, 0.9)");
      gradient.addColorStop(0.3, "rgba(25, 15, 50, 0.8)");
      gradient.addColorStop(0.6, "rgba(35, 20, 65, 0.7)");
      gradient.addColorStop(1, "rgba(45, 25, 80, 0.9)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawConnections();

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 text-white overflow-hidden relative">
      {/* Enhanced Animated Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Multiple Gradient Overlays for Depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-transparent to-indigo-800/30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_20%,rgba(120,40,200,0.3),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(80,20,120,0.4),transparent)] pointer-events-none" />

      {/* Animated Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
      linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🔊</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              EchoVerse
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-6 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300 hover:shadow-lg"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="p-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300"
                >
                  <svg
                    className="w-6 h-6 fill-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                  >
                    <path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition-all duration-300 hover:shadow-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div
            className={`transition-all duration-1000 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full mb-8 shadow-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
              <span className="text-sm">
                AI-Powered Text-to-Speech Platform
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
                Give Voice
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-purple-200 bg-clip-text text-transparent">
                To Your Words
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-4xl mx-auto leading-relaxed">
              Transform text into natural, human-like speech with our advanced
              AI technology. Experience the future of voice synthesis today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                to={user ? "/dashboard" : "/register"}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                <span className="relative z-10 text-lg font-semibold">
                  Start Creating Voices
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
              </Link>

              <button className="px-8 py-4 border border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-lg hover:shadow-lg">
                <span className="text-lg font-semibold">Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Enhanced Animated Preview */}
          <div
            className={`max-w-4xl mx-auto bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl p-8 transition-all duration-1000 delay-300 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"} shadow-2xl`}
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white/10 rounded-lg h-8"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 p-4 rounded-lg border border-purple-500/50">
                  <p className="text-gray-200">
                    "Welcome to the future of voice technology..."
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button className="flex-1 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="flex justify-center">
                      <svg
                        className="w-5 h-5 fill-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 640 640"
                      >
                        <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z" />
                      </svg>
                      Play
                    </span>
                  </button>
                  <button className="flex-1 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="flex justify-center">
                      <svg
                        className="w-5 h-5 fill-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width="24"
                        height="24"
                        role="img"
                        aria-label="Download"
                        fill="currentColor"
                      >
                        <path d="M256 48v232l76-76 28 28-132 132-132-132 28-28 76 76V48z" />
                        <path d="M48 448h416v32H48z" />
                      </svg>
                      Download
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Voice Parameters</span>
                    <span>AI Optimized</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Naturalness</span>
                      <div className="w-24 bg-white/10 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Clarity</span>
                      <div className="w-24 bg-white/10 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full w-4/5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Why Choose EchoVerse?
              </span>
            </h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              Powered by cutting-edge AI technology, we deliver the most natural
              and expressive text-to-speech experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-6 rounded-2xl backdrop-blur-lg border transition-all duration-500 transform hover:scale-105 ${
                  index === currentFeature
                    ? "bg-white/15 border-white/40 shadow-2xl"
                    : "bg-white/10 border-white/20 hover:bg-white/15"
                }`}
                onMouseEnter={() => setCurrentFeature(index)}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-2xl mb-4 transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-200 leading-relaxed">
                  {feature.description}
                </p>

                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl hover:bg-white/15 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Text?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join thousands of users who are already creating amazing voice
              content with EchoVerse
            </p>
            <Link
              to={user ? "/dashboard" : "/register"}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              <span>Start Free Trial</span>
              <svg
                className="w-6 h-6 fill-white ml-3"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path d="M566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3C348.8 149.8 348.8 170.1 361.3 182.6L466.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L466.7 352L361.3 457.4C348.8 469.9 348.8 490.2 361.3 502.7C373.8 515.2 394.1 515.2 406.6 502.7L566.6 342.7z" />
              </svg>
            </Link>

            <div className="mt-6 text-sm text-gray-300">
              No credit card required • Free forever tier available
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-t border-white/20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-lg">🔊</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              EchoVerse
            </span>
          </div>
          <p className="text-gray-300">
            © 2024 EchoVerse. The future of voice technology is here.
          </p>
        </div>
      </footer>

      {/* Enhanced Floating Elements */}
      <div className="absolute top-1/4 left-10 w-4 h-4 bg-cyan-400 rounded-full opacity-60 animate-pulse shadow-lg"></div>
      <div className="absolute top-1/3 right-20 w-6 h-6 bg-purple-400 rounded-full opacity-70 animate-bounce shadow-lg"></div>
      <div className="absolute bottom-1/4 left-1/4 w-3 h-3 bg-pink-400 rounded-full opacity-80 animate-ping shadow-lg"></div>
      <div className="absolute top-3/4 right-1/3 w-5 h-5 bg-blue-400 rounded-full opacity-50 animate-pulse shadow-lg"></div>
    </div>
  );
};

export default HomePage;
