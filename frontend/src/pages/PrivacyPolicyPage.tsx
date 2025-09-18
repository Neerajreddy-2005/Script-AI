
import { useEffect, useRef } from 'react';

const PrivacyPolicyPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            entry.target.classList.remove('opacity-0');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header Section */}
      <section 
        ref={headerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 opacity-0"
      >
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            Privacy <span className="text-scriptai-blue">Policy</span>
          </h1>
          <p className="text-xl text-scriptai-darkgray max-w-3xl mx-auto">
            Last updated: May 15, 2023
          </p>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="prose prose-blue max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Welcome to ScriptAI ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
            <p>
              Please read this Privacy Policy carefully. By accessing or using our service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
            </p>

            <h2>2. Information We Collect</h2>
            <p>
              We may collect several types of information from and about users of our service, including:
            </p>
            <ul>
              <li>
                <strong>Personal Information:</strong> This includes information that can be used to identify you, such as your name, email address, and payment information.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you access and use our service, including your IP address, browser type, device information, and the pages you visit.
              </li>
              <li>
                <strong>User Content:</strong> The content you create, upload, or generate using our service, including scripts, preferences, and settings.
              </li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>
              We use the information we collect for various purposes, including:
            </p>
            <ul>
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To process your transactions</li>
              <li>To improve our service and user experience</li>
              <li>To provide customer support</li>
              <li>To send you promotional communications (if you opt-in)</li>
              <li>To monitor and analyze usage patterns</li>
              <li>To detect, prevent, and address technical issues</li>
            </ul>

            <h2>4. Data Retention</h2>
            <p>
              We will retain your information for as long as your account is active or as needed to provide you with our services. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee the absolute security of your data.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul>
              <li>The right to access the personal information we have about you</li>
              <li>The right to rectify inaccurate information</li>
              <li>The right to erase your personal information</li>
              <li>The right to restrict or object to processing</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>

            <h2>7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:privacy@scriptai.com" className="text-scriptai-blue hover:underline">privacy@scriptai.com</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
