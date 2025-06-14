-- Update RLS policies for listings table
-- Add INSERT policy for owners
CREATE POLICY "Owners can create listings"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'owner'));

-- Add UPDATE policy for owners
CREATE POLICY "Owners can update their own listings"
ON public.listings FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = listings.id
    AND o.profile_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = listings.id
    AND o.profile_id = auth.uid()
));

-- Update RLS policies for owner_listings table
-- Add INSERT policy for owners
CREATE POLICY "Owners can create owner listings"
ON public.owner_listings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_listings.owner_id
    AND o.profile_id = auth.uid()
));

-- Add DELETE policy for owners
CREATE POLICY "Owners can delete their own owner listings"
ON public.owner_listings FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_listings.owner_id
    AND o.profile_id = auth.uid()
));