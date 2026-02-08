-- Allow creators to update volunteer status (accept/reject) for their tasks
CREATE POLICY "Creators can update volunteer status for their tasks"
ON public.task_volunteers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_volunteers.task_id
    AND tasks.creator_id = auth.uid()
  )
)