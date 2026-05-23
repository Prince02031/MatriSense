"use client"; // Make it a client component for interactivity

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./landingPage.css";

const LandingPage: React.FC = () => {
  const router = useRouter();

  return (
    <div>
      {/* Navbar */}
      <div className="navbar">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center">
            {/* Ensure this path points to your public folder */}
            <img
              src="/Odyssey_Logo.png"
              alt="Odyssey Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl sm:text-2xl font-medium font-odyssey tracking-wider">
            Odyssey
          </span>
        </div>

        <div className="nav-right">
          <a className="active" href="#">About</a>
          <button
            onClick={() => router.push('/destinations')}
            className="text-[#111] hover:text-gray-200 transition-colors"
          >
            Destinations
          </button>
          <a href="#">Pricing</a>
          {/* Sign-in navigates to /login */}
          <Link href="/login">
            <button className="signin-btn">Sign-in</button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <div className="first">
          <div id="text">
            <h1>Your Journey, <br /> Unified</h1>
            <p>
              Simplify trip organization with intuitive planning tools and connect with a vibrant
              community of travelers. Powered by AI for personalized itineraries and optimized
              routes.
            </p>
            <br />
            <Link href="/planner">
              <button className="btn" id="travel">Start Planning Now</button>
            </Link>
            <button className="btn" id="learn">Learn more</button>
          </div>
          <div id="travelIMG">
            <img src="/cover.png" alt="Travel Cover" />
          </div>
        </div>

        {/* Features */}
        <div className="second">
          <div className="box ai">
            <h3>✨ AI Assistant</h3>
            <p>Personalized itineraries generated in seconds</p>
          </div>

          <div className="box routes">
            <h3>🗺️ Smart Routes</h3>
            <p>
              AI-powered route optimization that saves time and money,
              ensuring you visit attractions in the most efficient sequence.
            </p>
          </div>

          <div className="box explore">
            <h3>🌍 Discover and Explore</h3>
            <p>
              Browse destinations categorized by <strong>Nature</strong>,
              <strong>Urban Lifestyle</strong>, and <strong>History & Museums</strong> to find your
              perfect adventure.
            </p>
          </div>

          <div className="box memory">
            <h3>📸 Memory Lane</h3>
            <p>
              Automatically chronicle your travel history with a beautiful timeline of all the places
              you've visited.
            </p>
          </div>

          <div className="box community">
            <h3>👥 Community</h3>
            <p>Connect with travelers worldwide</p>
          </div>

          <div className="box budget">
            <h3>💰 Budget Estimates</h3>
            <p>
              Get accurate cost estimates for transportation, accommodation, and activities before
              you book.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="third">
        <div className="sec">
          <h3>120K+</h3>
          <p>Happy Travellers</p>
        </div>

        <div className="sec">
          <h3>500K+</h3>
          <p>Destinations</p>
        </div>

        <div className="sec">
          <h3>10K+</h3>
          <p>Shared itineraries</p>
        </div>

        <div className="sec">
          <h3>5K+</h3>
          <p>New users daily</p>
        </div>
      </div>

      {/* How it works */}
      <div className="pad">
        <div className="four">
          <h1>How It Works</h1>
          <p>Start your journey in three simple steps</p>
          <h2>1</h2>
          <h4>Search for your target destination and browse through our curated selection of attractions</h4>
          <h2>2</h2>
          <h4>Use our AI assistant or manual planner to create the perfect itinerary with optimized routes and estimated costs</h4>
          <h2>3</h2>
          <h4>Share your journey with the community and discover hidden gems from fellow travelers.</h4>
        </div>
      </div>

      {/* Call to action */}
      <div className="pad">
        <div className="five">
          <div className="plan">
            <h3>Ready to Start Your Adventure?</h3>
            <p>Join thousands of travelers planning their perfect trips</p>
            <Link href="/planner">
              <button className="start-btn">Start Planning Now</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pad">
        <div className="six">
          <h6>©Odyssey. Made with ❤️ by Route6</h6>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
