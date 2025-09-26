import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo/logo';
import styles from './Landing.module.css';

const Landing = () => {
  return (
    <div className={styles.container}>
      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <Logo size="medium" />
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
            Your Partner in a <span className={styles.highlight}>Circular Economy</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Connect waste givers with collectors to promote sustainable recycling 
            practices and build a greener future together.
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
    <svg
      viewBox="0 0 512 512"
      className={styles.illustration}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#474747">
        <path d="M104.33,391.01c1.74,0,3.47-0.64,4.83-1.93c2.8-2.67,2.91-7.1,0.24-9.9c-33.92-35.6-52.61-82.21-52.61-131.27 c0-43.22,14.17-83.98,40.99-117.88c2.2-2.79,1.97-6.78-0.54-9.29l-9.27-9.27l59.58-15.97l-15.97,59.58l-6.22-6.22 c-1.44-1.44-3.45-2.19-5.46-2.03c-2.03,0.15-3.89,1.17-5.11,2.81C93.53,178.21,82.3,212.2,82.3,247.91 c0,41.49,15.47,81.14,43.56,111.65c2.62,2.84,7.05,3.03,9.89,0.41c2.84-2.62,3.03-7.05,0.41-9.89 c-25.7-27.92-39.86-64.2-39.86-102.17c0-29.95,8.63-58.57,25.03-83.27l8.91,8.91c1.77,1.77,4.35,2.46,6.76,1.81 c2.42-0.65,4.3-2.53,4.95-4.95l22.25-83.01c0.65-2.42-0.04-4.99-1.81-6.76c-1.77-1.77-4.35-2.46-6.76-1.81l-83.01,22.25 c-2.42,0.65-4.3,2.53-4.95,4.95s0.04,4.99,1.81,6.76L83,126.3c-26.33,35.38-40.21,77.29-40.21,121.61 c0,52.66,20.05,102.71,56.47,140.92C100.63,390.28,102.48,391.01,104.33,391.01z"/>
        <path d="M468.27,187.97c-1.25-2.17-3.56-3.5-6.06-3.5h-20.68c-0.74-2.26-1.52-4.53-2.34-6.77 c-14.28-38.92-39.77-72.27-73.72-96.43C330.75,56.56,289.85,43.5,247.2,43.5c-25.25,0-49.92,4.57-73.32,13.59 c-3.61,1.39-5.4,5.44-4.01,9.05c1.39,3.61,5.44,5.4,9.05,4.01c21.78-8.4,44.75-12.66,68.28-12.66 c79.55,0,151.42,50.24,178.85,125.03c1.33,3.62,2.55,7.3,3.62,10.93c0.88,2.97,3.61,5.02,6.71,5.02h13.71l-30.84,53.42 l-16.51-28.59l-14.2-24.59h6.29c2.3,0,4.46-1.13,5.76-3.03s1.6-4.31,0.78-6.46c-1.52-3.99-3.23-7.99-5.09-11.88 c-13.21-27.74-33.87-51.22-59.76-67.9c-26.59-17.13-57.43-26.19-89.2-26.19c-20.28,0-40.08,3.64-58.86,10.82 c-3.61,1.38-5.42,5.43-4.04,9.04c1.38,3.61,5.43,5.42,9.04,4.04c17.18-6.57,35.3-9.89,53.86-9.89 c57.91,0,111.42,33.8,136.33,86.12h-7.87c-2.5,0-4.81,1.33-6.06,3.5c-1.25,2.17-1.25,4.83,0,7l20.13,34.87l22.7,39.32 c1.25,2.17,3.56,3.5,6.06,3.5s4.81-1.33,6.06-3.5l42.96-74.42C469.52,192.8,469.52,190.14,468.27,187.97z"/>
        <path d="M138.18,388.89c-1.03,2.28-0.76,4.93,0.7,6.96l50.23,69.73c1.32,1.84,3.44,2.91,5.68,2.91 c0.23,0,0.47-0.01,0.7-0.04c2.49-0.25,4.65-1.81,5.68-4.09l7.1-15.77c12.75,2.47,25.82,3.72,38.93,3.72 c47.05,0,93.01-16.44,129.42-46.3c35.9-29.44,60.95-70.49,70.54-115.57c0.8-3.78-1.61-7.5-5.39-8.3 c-3.77-0.8-7.5,1.61-8.3,5.39c-18.57,87.37-96.9,150.78-186.26,150.78c-14.01,0-27.97-1.53-41.47-4.55 c-3.25-0.73-6.55,0.93-7.91,3.96l-4.43,9.84l-36.06-50.06l61.38-6.19l-4.25,9.43c-0.89,1.98-0.81,4.26,0.21,6.17 c1.02,1.91,2.88,3.25,5.02,3.6c9.01,1.51,18.27,2.28,27.51,2.28c75.29,0,140.97-50.86,159.7-123.69 c0.96-3.74-1.29-7.56-5.04-8.52s-7.56,1.29-8.52,5.04C376.2,352.27,316.1,398.81,247.2,398.81c-5.39,0-10.79-0.28-16.13-0.85 l5.38-11.95c1.03-2.28,0.76-4.93-0.7-6.96c-1.46-2.03-3.89-3.12-6.38-2.87l-85.5,8.63C141.37,385.05,139.21,386.61,138.18,388.89z"/>
        <path d="M297.09,183.71c-0.59-1.23-1.2-2.45-1.82-3.66c-10.44-20.17-25.65-37.96-43.99-51.44 c-0.3-0.22-0.61-0.39-0.98-0.52c-0.64-0.27-1.3-0.43-1.99-0.51c-0.67-0.1-1.36-0.1-2.04,0c-0.7,0.08-1.35,0.25-1.99,0.51 c-0.37,0.14-0.68,0.3-0.98,0.52c-18.34,13.48-33.56,31.27-43.99,51.44c-10.79,20.85-16.49,44.37-16.49,68 c0,8.04,0.65,16.12,1.93,24c0.62,3.82,4.21,6.4,8.04,5.78c3.82-0.62,6.4-4.22,5.78-8.04c-1.16-7.14-1.75-14.46-1.75-21.75 c0-7.46,0.64-14.86,1.86-22.13l41.77,47.04v36.84v37.23c-11.61-10.64-21.38-23.31-28.62-37.25c-1.78-3.43-6.01-4.77-9.44-2.99 c-3.43,1.78-4.77,6.01-2.99,9.44c10.43,20.09,25.61,37.81,43.89,51.25c0.3,0.22,0.61,0.39,0.98,0.52 c0.64,0.27,1.3,0.43,1.99,0.51c0.67,0.1,1.36,0.1,2.04,0c0.7-0.08,1.35-0.25,1.99-0.51c0.37-0.14,0.68-0.3,0.98-0.52 c18.34-13.48,33.56-31.27,43.99-51.44c9.84-19.01,15.43-40.24,16.34-61.75c0.53-1.44,0.57-3.02,0.12-4.48 c0.01-0.59,0.03-1.18,0.03-1.77C311.69,225.7,306.65,203.6,297.09,183.71z M254.06,233.55l34.39-34.39 c6.02,15.38,9.24,31.9,9.24,48.75c0,0.41-0.01,0.83-0.02,1.24l-43.61,43.61V233.55z M282.24,185.57l-28.18,28.18v-64.82 C265.56,159.48,275.07,171.92,282.24,185.57z M202.21,209.12c6.97-22.93,20-43.82,37.84-60.19v81.71v21.08L202.21,209.12z M254.06,346.89v-34.32l41.61-41.61C290.56,300.02,275.91,326.85,254.06,346.89z"/>
        <path d="M201.85,294.59c0.25-0.38,0.46-0.79,0.64-1.21c0.17-0.42,0.31-0.86,0.4-1.31c0.09-0.45,0.14-0.91,0.14-1.37 c0-0.45-0.05-0.91-0.14-1.37c-0.09-0.44-0.23-0.88-0.4-1.3c-0.18-0.43-0.39-0.83-0.64-1.21c-0.26-0.39-0.55-0.75-0.87-1.07 c-1.63-1.62-4.05-2.37-6.32-1.91c-0.45,0.09-0.89,0.22-1.31,0.4c-0.43,0.17-0.83,0.39-1.21,0.64c-0.38,0.26-0.74,0.55-1.06,0.87 c-0.33,0.32-0.62,0.68-0.88,1.07c-0.25,0.38-0.46,0.78-0.64,1.21c-0.17,0.42-0.31,0.86-0.4,1.3c-0.09,0.46-0.14,0.92-0.14,1.37 c0,0.46,0.05,0.92,0.14,1.37c0.09,0.45,0.23,0.89,0.4,1.31c0.18,0.42,0.39,0.83,0.64,1.21c0.26,0.38,0.55,0.74,0.88,1.06 c0.32,0.33,0.68,0.62,1.06,0.87s0.78,0.47,1.21,0.65c0.42,0.17,0.86,0.31,1.31,0.4c0.45,0.09,0.91,0.13,1.37,0.13 c1.84,0,3.64-0.74,4.95-2.05C201.3,295.33,201.59,294.97,201.85,294.59z"/>
      </g>
    </svg>
  </div>
</div>

      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Why Choose EcoTayo?</h2>
          <div className={styles.featureGrid}>
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
              <p>Complete transactions and earn rewards for your contribution</p>
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