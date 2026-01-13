import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Shield,
  Globe,
  Lock,
  Layers,
  FolderKanban,
  CheckCircle2,
  Calendar,
  FileText,
  MessageSquare,
  Workflow,
  BookOpen,
  UserCog,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mainFeatures = [
  {
    icon: Building2,
    title: "Multi-Tenant Architecture",
    description:
      "Run multiple companies from a single platform. Each tenant has complete data isolation with secure, scoped access controls.",
  },
  {
    icon: Users,
    title: "Flexible User Management",
    description:
      "Support for internal employees, external contractors, and guest users. Define who sees what across your organization.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    description:
      "Granular permissions from site admins to module-specific roles. Control access at the company, location, and module level.",
  },
  {
    icon: Layers,
    title: "Modular Design",
    description:
      "Enable only the modules you need. Projects, Tasks, Documents, LMS, and more - all seamlessly integrated.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description:
      "Row-level security, encrypted data, and comprehensive audit logs. Your data is protected at every layer.",
  },
  {
    icon: Globe,
    title: "Public Forms",
    description:
      "Create and publish forms that can accept submissions without login. Perfect for surveys, applications, and feedback.",
  },
];

const modules = [
  {
    icon: FolderKanban,
    name: "Projects",
    description: "Plan, track, and deliver projects with visual boards and timelines.",
  },
  {
    icon: CheckCircle2,
    name: "Tasks",
    description: "Manage to-dos with assignments, due dates, and progress tracking.",
  },
  {
    icon: Calendar,
    name: "Calendar",
    description: "Schedule events, meetings, and deadlines across your organization.",
  },
  {
    icon: FileText,
    name: "Documents",
    description: "Store, organize, and collaborate on files with version control.",
  },
  {
    icon: MessageSquare,
    name: "Notes",
    description: "Capture ideas and meeting notes with rich text editing.",
  },
  {
    icon: Globe,
    name: "Forms",
    description: "Build custom forms and surveys with conditional logic.",
  },
  {
    icon: Workflow,
    name: "Workflows",
    description: "Automate processes with customizable approval workflows.",
  },
  {
    icon: BookOpen,
    name: "LMS",
    description: "Create courses and training programs for your team.",
  },
];

const roles = [
  {
    icon: UserCog,
    name: "Site Admin",
    description: "Manage all companies, enable modules, and publish global resources.",
  },
  {
    icon: Building2,
    name: "Company Admin",
    description: "Manage your company's users, locations, and module access.",
  },
  {
    icon: Eye,
    name: "Module Admin",
    description: "Administer specific modules within your company.",
  },
  {
    icon: Users,
    name: "User",
    description: "Access assigned modules and collaborate with your team.",
  },
];

export default function FeaturesPage() {
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
              Powerful Features for Modern Teams
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Everything you need to run a multi-tenant organization, all in one platform.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Core Platform Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built from the ground up for enterprise-grade multi-tenancy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Integrated Modules
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enable only what you need. Each module is fully integrated with the platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module, index) => (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-md bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <module.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">{module.name}</h3>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Flexible Role System
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Define exactly who can access what across your organization.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {roles.map((role, index) => (
              <motion.div
                key={role.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                  <role.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">{role.name}</h3>
                <p className="text-xs text-muted-foreground">{role.description}</p>
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Start your free trial today and see how BusinessOS can transform your organization.
            </p>
            <Link to="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
