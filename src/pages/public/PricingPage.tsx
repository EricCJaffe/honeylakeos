import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small teams getting started.",
    features: [
      { name: "Up to 10 users", included: true },
      { name: "1 company", included: true },
      { name: "Core modules", included: true },
      { name: "5GB storage", included: true },
      { name: "Email support", included: true },
      { name: "Custom branding", included: false },
      { name: "API access", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing organizations with multiple teams.",
    features: [
      { name: "Up to 50 users", included: true },
      { name: "3 companies", included: true },
      { name: "All modules", included: true },
      { name: "50GB storage", included: true },
      { name: "Priority support", included: true },
      { name: "Custom branding", included: true },
      { name: "API access", included: true },
      { name: "Advanced analytics", included: false },
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with advanced needs.",
    features: [
      { name: "Unlimited users", included: true },
      { name: "Unlimited companies", included: true },
      { name: "All modules", included: true },
      { name: "Unlimited storage", included: true },
      { name: "24/7 support", included: true },
      { name: "Custom branding", included: true },
      { name: "Full API access", included: true },
      { name: "Advanced analytics", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight"
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Choose the plan that fits your organization. All plans include a 14-day free trial.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <Card
                  className={`h-full ${
                    plan.popular
                      ? "border-primary shadow-md"
                      : "border-border"
                  }`}
                >
                  <CardHeader className="text-center pt-8 pb-4">
                    <CardTitle className="text-lg mb-2">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {plan.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature.name}
                          className="flex items-center gap-2 text-sm"
                        >
                          {feature.included ? (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span
                            className={
                              feature.included
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.name === "Enterprise" ? "/contact" : "/signup"} className="block pt-2">
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ placeholder */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Questions?
          </h2>
          <p className="text-muted-foreground mb-6">
            Contact our sales team for custom pricing or any questions.
          </p>
          <Link to="/contact">
            <Button variant="outline">Contact Sales</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
