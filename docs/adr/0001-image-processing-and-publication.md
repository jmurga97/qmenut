# Separate shared image processing from product publication

Ming owns the reusable, product-scoped image job and its processing database; Qmenut
owns upload ownership and the intent to publish into a restaurant's content. The
publication intent stays in Qmenut so it can commit atomically with the form save,
which cannot be guaranteed across the two databases. Qmenut retains a local variant
catalogue for public reads and initially publishes through its minute cron, accepting
additional latency to avoid a second queue and callbacks before launch.
