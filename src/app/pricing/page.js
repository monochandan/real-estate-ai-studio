"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Footer from "@/components/Footer";
import { FaCheck, FaInfoCircle } from "react-icons/fa";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const PLANS = [
  { id: "basic", 
    name: "Basic Pack", 
    price: "$5", 
    credits: 30, 
    description: "Perfect for trying your first property.", 
    usage: [
      "≈ 3 decluttering edits",
      "≈ 2 staging edits",
      "≈ 1 short video",
    ],
  },
  { id: "standard", 
    name: "Standard Pack", 
    price: "$10", 
    credits: 70, 
    description: "For agents working on a few property photos.",
    usage: [
      "≈ 8 decluttering edits",
      "≈ 5 staging edits",
      "≈ 3 short videos",
    ],
  },
  { id: "pro", 
    name: "Professional Pack", 
    price: "$25", 
    credits: 200, 
    description: "Best value for active real-estate professionals.",
    usage: [
      "≈ 25 decluttering edits",
      "≈ 16 staging edits",
      "≈ 10 short videos",
    ],
    popular: true 
  },
  { id: "business", 
    name: "Business Pack", 
    price: "$50", 
    credits: 450, 
    description: "For agents and teams creating property content at scale.",
    usage: [
      "≈ 56 decluttering edits",
      "≈ 37 staging edits",
      "≈ 22 short videos",
    ],
  }
];

export default function Pricing() {
  const { data: session, status } = useSession();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleCheckout = async (planId) => {
    if (status !== "authenticated") {
      toast.error("You must sign in with Google to purchase credit packages.");
      return;
    }

    setLoadingPlan(planId);
    try {
      // this request is hiting api/checkout/route.js file to get the plan
      const { data } = await axios.post("/api/checkout", { planId });
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirection URL returned");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to trigger Stripe checkout session.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page select-none text-primary-text overflow-hidden">
      <Toaster position="top-right" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col gap-10 overflow-y-auto scrollbar-subtle items-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-1">
            <FaInfoCircle className="text-primary text-xs" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Pricing Plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Buy Credits Packs</h1>
          <p className="text-xs sm:text-sm text-secondary-text max-w-lg leading-relaxed">
           Use your credits for decluttering, virtual staging, and short
            property videos. Buy more credits anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-bg-card border rounded-lg p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                plan.popular ? "border-primary shadow-xl shadow-primary/5 scale-105" : "border-divider/50 shadow-md"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary-text">{plan.name}</h3>
                  <p className="text-2xl font-black tracking-tight text-black">{plan.price}</p>
                </div>
                
                <div className="text-xs bg-bg-page/50 border border-divider/30 p-3 rounded text-center font-extrabold text-primary">
                  {plan.credits} Art Credits
                </div>

                <p className="text-xs text-secondary-text leading-relaxed font-medium min-h-[3rem]">{plan.description}</p>
                
                <ul className="space-y-2 border-t border-divider/30 pt-4 text-xs font-semibold text-secondary-text">
                  {/* <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>Dynamic aspect ratios</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>HD image downloads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>No subscription required</span>
                  </li> */}
                  {plan.usage.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <FaCheck className="text-primary text-[10px] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>


                {/* Credit Costs */}
                <div className="pt-2 text-[10px] text-secondary-text space-y-1">
                  <div className="flex justify-between">
                    <span>Decluttering</span>
                    <span className="font-bold text-primary-text">
                      8 credits
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Staging</span>
                    <span className="font-bold text-primary-text">
                      12 credits
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>30-sec video</span>
                    <span className="font-bold text-primary-text">
                      20 credits
                    </span>
                  </div>
                </div>
    
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer select-none active:scale-[0.98] ${
                  plan.popular ? "bg-primary text-white hover:bg-primary-hover shadow-primary/15" : "bg-bg-page hover:bg-bg-card text-primary-text border border-divider"
                }`}
              >
                {loadingPlan === plan.id ? "Loading checkout..." : "Purchase Credits"}
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
