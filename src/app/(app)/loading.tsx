import { Skeleton } from '@/components/ui/skeleton'

// Varied ratios so the placeholder reads as a masonry grid rather than a
// suspiciously even one. Real cards reserve their exact box from the row's
// width/height, so nothing shifts once the photos arrive (SPEC §5.1).
const RATIOS = [
  '3 / 2',
  '2 / 3',
  '1 / 1',
  '4 / 3',
  '3 / 4',
  '16 / 9',
  '2 / 3',
  '3 / 2',
  '1 / 1',
  '3 / 4',
  '4 / 3',
  '2 / 3',
]

export default function GalleryLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
      </div>
      <div
        aria-hidden="true"
        className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
      >
        {RATIOS.map((ratio, index) => (
          <Skeleton
            key={index}
            style={{ aspectRatio: ratio }}
            className="mb-4 w-full break-inside-avoid rounded-md"
          />
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading photos
      </span>
    </div>
  )
}
