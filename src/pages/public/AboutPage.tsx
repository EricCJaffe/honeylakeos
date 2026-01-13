import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, Heart, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're on a mission to help organizations operate more effectively and empower their teams.",
  },
  {
    icon: Heart,
    title: "User-Centric",
    description: "Every feature we build starts with understanding the real needs of our users.",
  },
  {
    icon: Users,
    title: "Collaborative",
    description: "We believe the best work happens when teams can work together seamlessly.",
  },
  {
    icon: Lightbulb,
    title: "Innovative",
    description: "We continuously push boundaries to deliver cutting-edge solutions.",
  },
];

const stats = [
  { value: "10,000+", label: "Active Users" },
  { value: "500+", label: "Companies" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

export default function AboutPage() {
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
              About BusinessOS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              We're building the operating system for modern organizations.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  BusinessOS was born from a simple observation: organizations spend too much time
                  wrestling with disconnected tools and complex systems. We believed there had to
                  be a better way.
                </p>
                <p>
                  Today, BusinessOS serves hundreds of organizations worldwide, helping them
                  streamline operations, empower their teams, and focus on what matters most—their
                  mission.
                </p>
                <p>
                  Our platform combines enterprise-grade security with beautiful, intuitive design,
                  making it easy for organizations of any size to manage their teams, projects, and
                  workflows in one unified space.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Our Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full text-center border-border">
                  <CardContent className="pt-6 pb-4">
                    <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                      <value.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{value.title}</h3>
                    <p className="text-xs text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Join Our Journey
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              We're always looking for talented people to join our team.
            </p>
            <Link to="/contact">
              <Button size="lg">Get in Touch</Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
