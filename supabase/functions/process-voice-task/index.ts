import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { transcribedText } = await req.json();
    
    if (!transcribedText || typeof transcribedText !== 'string') {
      throw new Error('No transcribed text provided');
    }

    console.log('Processing transcribed text:', transcribedText);

    // Use Lovable AI to process the transcribed text into a structured task
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that converts voice requests into structured help tasks. 
            Given a voice transcription of someone asking for help, extract:
            1. A clear, concise title (max 60 characters)
            2. A helpful description (1-2 sentences)
            3. Urgency level: "low" (can wait), "medium" (today/tomorrow), or "high" (urgent/ASAP)
            4. Estimated time: "15min", "30min", "1hour", "2hours", or "half_day"
            5. Location: If the user mentions any place, address, neighborhood, landmark, or city, extract it. Examples: "at my house on 123 Main St", "near Central Park", "downtown Seattle", "at the grocery store". Return null if no location is mentioned.
            
            Respond ONLY with a valid JSON object, no markdown, no explanation.`
          },
          {
            role: 'user',
            content: `Convert this voice request into a task: "${transcribedText}"`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_task',
              description: 'Create a structured task from voice input',
              parameters: {
                type: 'object',
                properties: {
                  title: { 
                    type: 'string', 
                    description: 'Clear, concise task title (max 60 chars)' 
                  },
                  description: { 
                    type: 'string', 
                    description: 'Brief description of the task (1-2 sentences)' 
                  },
                  urgency: { 
                    type: 'string', 
                    enum: ['low', 'medium', 'high'],
                    description: 'Urgency level of the task'
                  },
                  time_needed: { 
                    type: 'string', 
                    enum: ['15min', '30min', '1hour', '2hours', 'half_day'],
                    description: 'Estimated time to complete the task'
                  },
                  location: { 
                    type: 'string', 
                    nullable: true,
                    description: 'Location mentioned in the request (address, place name, landmark, neighborhood). Null if not mentioned.'
                  }
                },
                required: ['title', 'description', 'urgency', 'time_needed', 'location'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_task' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI processing error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_task') {
      throw new Error('Invalid AI response format');
    }

    const taskData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted task data:', taskData);

    // If location was extracted, geocode it
    if (taskData.location) {
      console.log('Attempting to geocode:', taskData.location);
      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(taskData.location)}&limit=1`,
          { headers: { 'User-Agent': 'HelpNow/1.0' } }
        );
        const geoData = await geoResponse.json();
        console.log('Geocoding result:', JSON.stringify(geoData));
        
        if (geoData && geoData.length > 0) {
          taskData.location_name = geoData[0].display_name;
          taskData.location_lat = parseFloat(geoData[0].lat);
          taskData.location_lng = parseFloat(geoData[0].lon);
          console.log('Geocoded successfully:', taskData.location_name, taskData.location_lat, taskData.location_lng);
        } else {
          // No geocoding results - keep raw location for user to refine
          console.log('No geocoding results, keeping raw location');
          taskData.location_raw = taskData.location;
        }
      } catch (geoError) {
        console.error('Geocoding failed:', geoError);
        taskData.location_raw = taskData.location;
      }
    }

    return new Response(JSON.stringify(taskData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Process voice task error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
