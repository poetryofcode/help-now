## Inspiration
Many communities have neighbors who need small acts of help—picking up groceries, assembling furniture, or a friendly visit—but lack a simple way to connect with nearby volunteers. HelpNow is built on the idea that kindness should be frictionless and local.

## What it does
HelpNow is a real-time community task-sharing platform that connects people who need help with local volunteers. A user can:
- Post tasks with urgency levels, time estimates, and location  
- Discover nearby requests through a live feed or interactive map  
- Offer help and coordinate using in-app messaging  
- Build trust through ratings, badges, and tracked volunteer hours  
- Create tasks hands-free using voice input with AI enhancement  

## How it is built
- **Frontend:** React + TypeScript with Tailwind CSS and Framer Motion for smooth animations  
- **Backend:** Lovable Cloud (Supabase) for real-time database, authentication (email/Google), and Edge Functions  
- **Maps:** Leaflet with OpenStreetMap and Nominatim for geocoding and nearby task discovery  
- **AI:** Voice-to-text with ElevenLabs and task improvement suggestions using LLMs  
- **Real-time:** PostgreSQL subscriptions for live task updates and chat messaging  

## Challenges we ran into
- Implementing stable map rendering in React required direct Leaflet DOM control  
- Balancing real-time subscriptions with performance  
- Designing a clear task acceptance flow with correct status handling  
- Enforcing secure RLS policies without harming user experience  

## Accomplishments that we're proud of
- A fully working real-time chat between task creators and volunteers  
- A smart “Best Match” system based on skills and proximity  
- Voice-based task creation with automatic AI cleanup  
- A clean, accessible UI with both list and map views  

## What we learned
- Real-time apps need careful state and subscription management  
- Location features need fallbacks when permissions are denied  
- Small UX details greatly increase trust and clarity  

## What's next for HelpNow
- Push notifications for nearby tasks and updates  
- Support for recurring community tasks  
- Organization accounts for nonprofits and local groups  
- Expanded gamification with milestones and leaderboards  
- A mobile app with offline support  
