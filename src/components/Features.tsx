import { motion } from 'framer-motion';
import { Zap, MapPin, MessageSquare, Award, Shield, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Real-Time Matching',
    description: 'Tasks appear instantly in your feed. No refreshing needed — help is always just a tap away.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: MapPin,
    title: 'Hyperlocal Focus',
    description: 'Find tasks in your neighborhood. Filter by distance and see exactly how far help is needed.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Smart suggestions help you find the best matches based on your skills and availability.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: MessageSquare,
    title: 'Easy Collaboration',
    description: 'Built-in chat keeps everyone connected. Coordinate with task creators and fellow volunteers.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Award,
    title: 'Earn Badges',
    description: 'Track your impact with badges and stats. See your volunteer hours and completed tasks grow.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Shield,
    title: 'Safe & Trusted',
    description: 'Verified profiles and community feedback keep everyone safe and accountable.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
];

export function Features() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Helping made <span className="text-primary">simple</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to find, accept, and complete volunteer tasks in your community.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-card border shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bg} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}