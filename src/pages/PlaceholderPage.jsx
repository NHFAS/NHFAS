import React from 'react';
import { Shield, CheckCircle, Users } from 'lucide-react';

const getPageContent = (title) => {
  const contentMap = {
    'About Us': 'We are NHFAS, a dedicated platform bridging the gap between customers and top-tier professionals. Our mission is to provide seamless access to handyman services, skilled artisans, and heavy haulage operations. Founded on the principles of trust and reliability, we ensure that every job is handled by verified experts.',
    'Careers': 'Join the NHFAS family! We are always looking for passionate individuals who want to make a difference. Whether you are an engineer, customer support specialist, or operations manager, we offer a dynamic and inclusive workplace where your ideas can thrive.',
    'Blog': 'Stay updated with the latest news, tips, and insights from the NHFAS team. From DIY home improvement guides to industry trends in heavy haulage, our blog is your go-to resource for everything related to professional services and trades.',
    'Contact': 'We would love to hear from you! If you have any questions, feedback, or need assistance with our platform, please reach out to our dedicated support team. You can contact us via email at support@nhfas.com or call us at 1-800-NHFAS-HELP. We are available 24/7 to assist you.',
    'Handyman Services': 'Our handyman services cover everything from plumbing and electrical repairs to furniture assembly and painting. All our handymen are rigorously vetted and highly experienced, ensuring that your home repairs are completed safely and efficiently.',
    'Skilled Artisans': 'Need custom woodwork, tailoring, or specialized craftsmanship? NHFAS connects you with the finest skilled artisans in your area. We take pride in supporting local talent and delivering exceptional quality for all your bespoke projects.',
    'Heavy Haulage': 'For your large-scale transportation needs, our heavy haulage network provides robust and reliable logistics solutions. Whether you are moving construction equipment or industrial machinery, our operators are fully licensed and equipped to handle heavy loads securely.',
    'Equipment Rental': 'Access a wide range of high-quality tools and machinery through our equipment rental service. From power tools to heavy construction equipment, we offer flexible rental periods and competitive pricing to help you get the job done right.',
    'FAQ': 'Got questions? We have answers. Browse through our Frequently Asked Questions to learn more about how to book a service, our pricing models, cancellation policies, and how we vet our professionals.',
    'Help Center': 'Welcome to the NHFAS Help Center. Here you can find comprehensive guides, troubleshooting articles, and step-by-step tutorials to help you navigate our platform and make the most out of your experience.',
    'Terms of Service': 'Please read these terms carefully before using our platform. By accessing NHFAS, you agree to be bound by these terms, which govern your use of our services, user responsibilities, and our liability limitations.',
    'Privacy Policy': 'Your privacy is critically important to us. This policy outlines how we collect, use, and protect your personal data when you use the NHFAS platform. We are committed to maintaining the highest standards of data security.',
    'Trust & Safety': 'Safety is our top priority. Every service provider on NHFAS undergoes a comprehensive background check and skill verification process. We also offer secure payment gateways and a robust dispute resolution system to ensure a safe environment for all users.'
  };

  return contentMap[title] || 'This section is currently being updated with new and exciting information. Please check back later!';
};

const PlaceholderPage = ({ title }) => {
  return (
    <div className="flex-1 bg-brand-softBlue py-16 lg:py-24 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-brand-navy mb-6 tracking-tight">
            {title}
          </h1>
          <div className="w-24 h-1.5 bg-brand-green mx-auto rounded-full"></div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            {getPageContent(title)}
          </p>

          {/* Decorative Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-100">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-brand-green" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">Verified Quality</h3>
              <p className="text-sm text-slate-500">All our services meet the highest industry standards.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">Secure & Safe</h3>
              <p className="text-sm text-slate-500">Your data and transactions are fully protected.</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">24/7 Support</h3>
              <p className="text-sm text-slate-500">Our team is always here to assist you.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlaceholderPage;
