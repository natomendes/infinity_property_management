-- Add RLS policies for owners to manage their own reservations
-- Policy: Owners can insert reservations for their own listings
CREATE POLICY "Owners can create reservations for their own listings"
ON public.reservations FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = reservations.listing_id
    AND o.profile_id = auth.uid()
));

-- Policy: Owners can update reservations for their own listings
CREATE POLICY "Owners can update their own reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = reservations.listing_id
    AND o.profile_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = reservations.listing_id
    AND o.profile_id = auth.uid()
));

-- Policy: Owners can delete reservations for their own listings
CREATE POLICY "Owners can delete their own reservations"
ON public.reservations FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = reservations.listing_id
    AND o.profile_id = auth.uid()
));