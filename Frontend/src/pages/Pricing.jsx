import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Pricing = () => {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, yearly: 0 },
      description: "Get started with basic text-to-speech features",
      features: [
        "1,000 characters per month",
        "Standard voice quality",
        "Basic speed control",
        "MP3 download",
        "Email support",
      ],
      limitations: [
        "No commercial use",
        "No API access",
        "No priority processing",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
      gradient: "from-gray-100 to-gray-200",
    },
    {
      name: "Pro",
      price: { monthly: 9, yearly: 90 },
      description: "For content creators and regular users",
      features: [
        "50,000 characters per month",
        "High quality voices",
        "Advanced speed control",
        "Multiple format downloads",
        "Priority support",
        "Commercial license",
        "API access (1,000 req/month)",
      ],
      limitations: [],
      buttonText: "Upgrade to Pro",
      buttonVariant: "primary",
      popular: true,
      gradient: "from-blue-50 to-indigo-100",
    },
    {
      name: "Business",
      price: { monthly: 29, yearly: 290 },
      description: "For businesses and high-volume users",
      features: [
        "200,000 characters per month",
        "Premium voice quality",
        "All voice options",
        "Batch processing",
        "24/7 priority support",
        "White-label option",
        "Unlimited API access",
        "Custom voice training (add-on)",
      ],
      limitations: [],
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      popular: false,
      gradient: "from-purple-50 to-pink-100",
    },
  ];

  const toggleBillingPeriod = () => {
    setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly");
  };

  const getPrice = (plan) => {
    const price = plan.price[billingPeriod];
    return billingPeriod === "yearly" ? price / 12 : price;
  };

  const getBillingNote = (plan) => {
    if (plan.price.yearly > 0 && billingPeriod === "yearly") {
      return `Save $${plan.price.monthly * 12 - plan.price.yearly} per year`;
    }
    return null;
  };

  return (
    <div className="mt-12 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-4">
            Flexible Pricing
          </div>
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Start with our free tier and upgrade as you grow. All plans include
            our core features with no hidden fees.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-white rounded-2xl p-2 border border-gray-200 shadow-sm inline-flex">
            <button
              type="button"
              className={`relative py-3 px-8 rounded-xl text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`relative py-3 px-8 rounded-xl text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${
                billingPeriod === "yearly"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly Billing
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                2 Months Free
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mt-16 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-6xl lg:mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl transition-all duration-300 hover:transform hover:scale-105 ${
                plan.popular
                  ? "shadow-2xl border-0"
                  : "shadow-lg border border-gray-200"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-2 z-[4] left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Card */}
              <div
                className={`h-full rounded-2xl bg-gradient-to-br ${plan.gradient} backdrop-blur-sm`}
              >
                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </h2>
                    <p className="mt-2 text-gray-600">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-gray-900">
                        ${getPrice(plan)}
                      </span>
                      <span className="text-lg text-gray-600 ml-2">/month</span>
                    </div>
                    {billingPeriod === "yearly" && plan.price.yearly > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        billed annually (${plan.price.yearly}/year)
                      </p>
                    )}
                    {getBillingNote(plan) && (
                      <p className="text-sm font-semibold text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full inline-block">
                        {getBillingNote(plan)}
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    to={
                      user
                        ? `/subscribe/${plan.name.toLowerCase()}`
                        : "/register"
                    }
                    className={`block w-full py-4 px-6 rounded-xl text-center font-semibold transition-all duration-300 transform hover:scale-105 ${
                      plan.buttonVariant === "primary"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-white text-blue-600 border-2 border-blue-600 shadow-md hover:bg-blue-50"
                    }`}
                  >
                    {plan.buttonText}
                  </Link>
                </div>

                {/* Features */}
                <div className="px-8 pb-8">
                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <svg
                        className="w-5 h-5 text-blue-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      What's Included
                    </h3>
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <svg
                            className="h-5 w-5 text-green-500 flex-shrink-0 mr-3 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.limitations.length > 0 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-6 flex items-center">
                          <svg
                            className="w-5 h-5 text-gray-400 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Limitations
                        </h3>
                        <ul className="space-y-4">
                          {plan.limitations.map((limitation) => (
                            <li key={limitation} className="flex items-start">
                              <svg
                                className="h-5 w-5 text-gray-400 flex-shrink-0 mr-3 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-gray-600">
                                {limitation}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                question: "Can I change plans anytime?",
                answer:
                  "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
                icon: "🔄",
              },
              {
                question: "Do you offer refunds?",
                answer:
                  "We offer a 14-day money-back guarantee for all paid plans. Contact support for refund requests.",
                icon: "💳",
              },
              {
                question: "What happens if I exceed my character limit?",
                answer:
                  "You can purchase additional character packs or upgrade to a higher plan. Unused characters don't roll over.",
                icon: "📊",
              },
              {
                question: "Is there API access?",
                answer:
                  "API access is available on Pro and Business plans. Free tier has limited API access.",
                icon: "🔌",
              },
              {
                question: "Can I use this for commercial purposes?",
                answer:
                  "Commercial use requires a Pro or Business plan. Free tier is for personal use only.",
                icon: "💼",
              },
              {
                question: "How do I cancel my subscription?",
                answer:
                  "You can cancel anytime from your account settings. No cancellation fees.",
                icon: "❌",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start space-x-4">
                  <span className="text-2xl">{faq.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-gray-600">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-12 text-center sm:px-12 lg:py-16 lg:px-16">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Need Custom Enterprise Solutions?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                We offer tailored solutions for large organizations with
                specific requirements, including custom voice training and
                dedicated support.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-blue-600 bg-white hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Contact Sales Team
                </Link>
                <Link
                  to="/enterprise"
                  className="inline-flex items-center px-8 py-3 border-2 border-white text-base font-medium rounded-xl text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
