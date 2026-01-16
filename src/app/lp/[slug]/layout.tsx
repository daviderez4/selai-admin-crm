import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TEMPLATE_INFO } from '@/types/marketing'

type Props = {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

// Generate dynamic metadata for OG tags (WhatsApp, Facebook, etc.)
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params

  // Default values
  let title = 'סלע ביטוח - הצעה מיוחדת'
  let description = 'קבל הצעת מחיר לביטוח בתנאים הטובים ביותר'
  let ogImage = 'https://selai.app/og-default.jpg'

  try {
    const supabase = await createClient()

    const { data: page } = await supabase
      .from('landing_pages')
      .select('name, meta, content, template')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (page) {
      title = page.meta?.title || page.name || title
      description = page.meta?.description || description

      // Use page's og_image or content image
      if (page.meta?.og_image) {
        ogImage = page.meta.og_image
      } else if (page.content?.hero?.image) {
        ogImage = page.content.hero.image
      } else {
        // Use template default image
        const template = TEMPLATE_INFO.find(t => t.slug === page.template)
        if (template) {
          // Use Unsplash images based on template
          const templateImages: Record<string, string> = {
            'car-insurance': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=630&fit=crop',
            'home-insurance': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=630&fit=crop',
            'life-insurance': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&h=630&fit=crop',
            'health-insurance': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=630&fit=crop',
            'business-insurance': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=630&fit=crop',
            'pension': 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=1200&h=630&fit=crop',
          }
          ogImage = templateImages[page.template] || ogImage
        }
      }
    }
  } catch (error) {
    console.error('Error fetching page metadata:', error)
    // Use fallback based on slug
    const template = TEMPLATE_INFO.find(t => slug.includes(t.slug))
    if (template) {
      title = `${template.name_he} - סלע ביטוח`
      description = template.description_he
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://selai.app'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/lp/${slug}`,
      siteName: 'SELAI InsuranceOS',
      locale: 'he_IL',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${baseUrl}/lp/${slug}`,
    },
  }
}

export default function LandingPageLayout({ children }: Props) {
  return children
}
