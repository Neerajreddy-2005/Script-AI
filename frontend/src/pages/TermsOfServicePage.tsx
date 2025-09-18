
import { useEffect, useRef } from 'react';

const TermsOfServicePage = () => {
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
            Terms of <span className="text-scriptai-blue">Service</span>
          </h1>
          <p className="text-xl text-scriptai-darkgray max-w-3xl mx-auto">
            Last updated: May 15, 2023
          </p>
        </div>
      </section>

      {/* Terms of Service Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="prose prose-blue max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using ScriptAI's services, you agree to be bound by these Terms of Service. If you do not agree to these Terms, you may not access or use our services.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              ScriptAI provides an AI-powered scriptwriting tool that helps users create professional scripts for videos, podcasts, and social media. Our service includes various features based on the subscription tier you select.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              To access certain features of our service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h2>4. Subscription Plans</h2>
            <p>
              ScriptAI offers various subscription options with different features and limitations. By selecting a subscription and providing payment information, you agree to pay the subscription fees for your chosen option. Subscription fees are charged at the beginning of each billing cycle.
            </p>
            <p>
              You can cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of your current billing cycle.
            </p>

            <h2>5. User Content</h2>
            <p>
              You retain ownership of any content you create, upload, or generate using our service. By using our service, you grant us a non-exclusive, royalty-free license to use, store, and display your content solely for the purpose of providing and improving our service.
            </p>
            <p>
              You are solely responsible for your content and must ensure that it does not violate any laws or infringe on any third-party rights.
            </p>

            <h2>6. Prohibited Uses</h2>
            <p>
              You agree not to use our service for any unlawful purpose or in any way that could damage, disable, or impair our service. Prohibited activities include but are not limited to:
            </p>
            <ul>
              <li>Using the service to generate content that is illegal, harmful, or offensive</li>
              <li>Attempting to gain unauthorized access to our systems or user accounts</li>
              <li>Using automated methods to access or use our service without our permission</li>
              <li>Interfering with or disrupting the integrity or performance of our service</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <p>
              Our service, including its underlying technology, features, graphics, and content provided by us, is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our service without our permission.
            </p>

            <h2>8. Disclaimer of Warranties</h2>
            <p>
              Our service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not guarantee that our service will be uninterrupted, secure, or error-free.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ScriptAI and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our service.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of any changes by posting the new Terms on our website. Your continued use of our service after the changes take effect constitutes your acceptance of the new Terms.
            </p>

            <h2>11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
              <br />
              <a href="mailto:terms@scriptai.com" className="text-scriptai-blue hover:underline">terms@scriptai.com</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfServicePage;
