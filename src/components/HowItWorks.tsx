import { motion } from 'framer-motion';
import { UserPlus, Search, HandHeart, PartyPopper } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Sign Up',
    description: 'Create your account in seconds. Add your skills and availability.',
    color: 'bg-primary',
  },
  {
    icon: Search,
    title: 'Browse Tasks',
    description: 'Find help requests near you. Filter by time, urgency, or skills needed.',
    color: 'bg-success',
  },
  {
    icon: HandHeart,
    title: 'Accept & Help',
    description: 'Tap to accept a task. Connect with the requester and lend a hand.',
    color: 'bg-warning',
  },
  {
    icon: PartyPopper,
    title: 'Make an Impact',
    description: 'Complete tasks, earn badges, and watch your positive impact grow.',
    color: 'bg-accent',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it <span className="text-primary">works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From sign up to making a difference — it only takes a few minutes.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-success to-accent" />
          
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border-2 border-primary items-center justify-center text-xs font-bold text-primary z-10">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.color} text-white mb-4 shadow-lg`}>
                  <step.icon className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}