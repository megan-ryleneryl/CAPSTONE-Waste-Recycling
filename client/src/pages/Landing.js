import React from 'react';
import { Link } from 'react-router-dom';
import EcoTayoLogo from '../components/navigation/TopNav/EcoTayoLogo.svg';
import styles from './Landing.module.css';

const Landing = () => {
  return (
    <div className={styles.container}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <img src={EcoTayoLogo} alt="EcoTayo Logo" className={styles.logo} />
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            {/* <a href="#about" className={styles.navLink}>About</a> */}
            <Link to="/login" className={styles.loginLink}>Log In</Link>
            <Link to="/register" className={styles.signupButton}>Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Engaging Filipinos <br/> <span className={styles.highlight}>in Recycling</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Creating a platform that connects recyclable waste from households to those who need it.
          </p>
          <div className={styles.heroButtons}>
            <Link to="/register" className={styles.primaryButton}>
              Get Started
            </Link>
            <a href="#how-it-works" className={styles.secondaryButton}>
              Learn More
            </a>
          </div>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>10,000+</span>
              <span className={styles.statLabel}>Active Users</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>50,000 kg</span>
              <span className={styles.statLabel}>Waste Recycled</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Collectors</span>
            </div>
          </div>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.imageCard}>
            <img
              src="/Hero image.png"
              alt="EcoTayo Hero"
              className={styles.illustration}
            />
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Why Choose EcoTayo?</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureTrack}>
              <div className={styles.featureCard}>
                <h3>Post Waste Easily</h3>
                <p>Upload photos and details of recyclable items you want to give away</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Efficient Collection</h3>
                <p>Collectors claim posts and schedule pickups at convenient times</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Earn Rewards</h3>
                <p>Get points for every successful transaction and unlock badges</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Be Aware</h3>
                <p>Be encouraged to make environmentally conscious decisions</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Verified Network</h3>
                <p>Join a trusted community of verified collectors and organizations</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Community Based</h3>
                <p>See how your community is contributing to a greener future</p>
              </div>
              {/* Duplicate cards for infinite loop */}
              <div className={styles.featureCard}>
                <h3>Post Waste Easily</h3>
                <p>Upload photos and details of recyclable items you want to give away</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Efficient Collection</h3>
                <p>Collectors claim posts and schedule pickups at convenient times</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Earn Rewards</h3>
                <p>Get points for every successful transaction and unlock badges</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Environmental Impact</h3>
                <p>Track your contribution to reducing waste and protecting the environment</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Verified Network</h3>
                <p>Join a trusted community of verified collectors and organizations</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Track Progress</h3>
                <p>Monitor your recycling statistics and environmental contribution</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.stepsContainer}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Sign Up</h3>
              <p>Create your account as a Giver, Collector, or Organization</p>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Post or Browse</h3>
              <p>Post recyclable items or browse available collections</p>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Connect</h3>
              <p>Match givers with collectors for efficient pickup</p>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Earn Points</h3>
              <p>Complete transactions and earn Rewards!</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready to Make a Difference?</h2>
          <p className={styles.ctaText}>
            Join thousands of users who are already contributing to a sustainable future
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/register" className={styles.ctaPrimaryButton}>
              Start Now - It's Free
            </Link>
            <Link to="/login" className={styles.ctaSecondaryButton}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <p className={styles.footerTagline}>Your Partner in a Circular Economy</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 Pioneering Paragons. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;