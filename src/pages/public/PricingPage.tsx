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
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 gradient-subtle" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
            >
              Simple, Transparent{" "}
              <span className="text-gradient">Pricing</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-muted-foreground mb-8"
            >
              Choose the plan that fits your organization. All plans include a 14-day free trial.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 pb-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <Card
                  className={`h-full ${
                    plan.popular
                      ? "border-primary shadow-glow"
                      : "border-border/50"
                  }`}
                >
                  <CardHeader className="text-center pb-8 pt-8">
                    <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature.name}
                          className="flex items-center gap-3"
                        >
                          {feature.included ? (
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          ) : (
                            <Minus className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
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
                    <Link to={plan.name === "Enterprise" ? "/contact" : "/signup"} className="block pt-4">
                      <Button
                        variant={plan.popular ? "hero" : "outline"}
                        className="w-full"
                        size="lg"
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
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Questions?
          </h2>
          <p className="text-muted-foreground mb-8">
            Contact our sales team for custom pricing or any questions.
          </p>
          <Link to="/contact">
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
