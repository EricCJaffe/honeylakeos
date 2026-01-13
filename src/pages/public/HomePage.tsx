import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Shield,
  Zap,
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Building2,
    title: "Multi-Tenant Architecture",
    description: "Securely manage multiple companies from a single platform with complete data isolation.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Define granular permissions for admins, managers, and team members across modules.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and row-level security to protect your sensitive data.",
  },
  {
    icon: Zap,
    title: "Powerful Modules",
    description: "Projects, Tasks, Documents, LMS, and more - all integrated seamlessly.",
  },
];

const modules = [
  { icon: LayoutDashboard, name: "Projects" },
  { icon: CheckCircle2, name: "Tasks" },
  { icon: Calendar, name: "Calendar" },
  { icon: FileText, name: "Documents" },
  { icon: MessageSquare, name: "Notes" },
  { icon: Globe, name: "Public Forms" },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
                Unify Your Organization
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight"
            >
              The Operating System for Your Business
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              BibleOS is a powerful multi-tenant intranet platform that brings together
              teams, projects, documents, and workflows in one secure space.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link to="/signup">
                <Button size="lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/features">
                <Button variant="outline" size="lg">
                  Explore Features
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">10k+ Users</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
            >
              Everything You Need to Run Your Business
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Built for modern teams who demand flexibility, security, and clarity.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              >
                Powerful Modules for Every Need
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-muted-foreground mb-8"
              >
                From project management to learning management, BibleOS provides
                all the tools your organization needs to thrive.
              </motion.p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {modules.map((module, index) => (
                  <motion.div
                    key={module.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 p-3 rounded-md bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    <module.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{module.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-video rounded-lg border border-border bg-card shadow-lg flex items-center justify-center">
                <div className="text-center p-8">
                  <LayoutDashboard className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Dashboard Preview</p>
                  <p className="text-sm text-muted-foreground">Clean, intuitive interface</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Organization?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of companies already using BibleOS to streamline
              operations and empower their teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button size="lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
