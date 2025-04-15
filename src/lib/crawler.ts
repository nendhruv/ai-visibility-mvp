import axios from 'axios'
import { promisify } from 'util'
import * as cheerio from 'cheerio'
import * as xml2js from 'xml2js'

const parseStringPromise = promisify(xml2js.parseString)

// Types for XML parsing
interface SitemapUrl {
  loc: string[];
}

interface Sitemap {
  urlset?: {
    url: SitemapUrl[];
  };
  sitemapindex?: {
    sitemap: SitemapUrl[];
  };
}

// Create axios instance
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': `Mozilla/5.0 (compatible; MarketIntelBot/1.0; ${process.env.NEXT_PUBLIC_URL})`
  }
})

async function getLinksFromSitemap(domain: string): Promise<string[] | null> {
  try {
    const sitemapUrl = domain.endsWith("/") ? `${domain}sitemap.xml` : `${domain}/sitemap.xml`
    const response = await axiosInstance.get(sitemapUrl)
    const xml = response.data
    const result = await parseStringPromise(xml) as Sitemap
    
    if (result.urlset?.url) {
      return result.urlset.url.map(item => item.loc[0])
    } else if (result.sitemapindex?.sitemap) {
      const firstSitemapUrl = result.sitemapindex.sitemap[0].loc[0]
      const subSitemapResponse = await axiosInstance.get(firstSitemapUrl)
      const subSitemapResult = await parseStringPromise(subSitemapResponse.data) as Sitemap
      if (subSitemapResult.urlset?.url) {
        return subSitemapResult.urlset.url.map(item => item.loc[0])
      }
    }
    return null
  } catch (error) {
    console.error("Sitemap fetch/parsing error:", error instanceof Error ? error.message : error)
    return null
  }
}

function getLinksFromHomepage(html: string, domain: string): string[] {
  const $ = cheerio.load(html)
  const links = new Set<string>()

  $("a").each((_, el) => {
    let href = $(el).attr("href")
    if (href) {
      try {
        if (href.startsWith("/")) {
          href = new URL(href, domain).toString()
        } else if (!href.startsWith("http")) {
          href = new URL(href, domain).toString()
        }

        const hrefDomain = new URL(href).hostname
        const baseDomain = new URL(domain).hostname
        if (hrefDomain === baseDomain) {
          links.add(href)
        }
      } catch (e) {
        // Invalid URL, skip it
      }
    }
  })

  return Array.from(links)
}

export async function crawlWebsite(domain: string): Promise<string> {
  try {
    const normalizedDomain = domain.startsWith("http") ? domain : `https://${domain}`
    let urls = await getLinksFromSitemap(normalizedDomain)
    
    if (!urls || urls.length === 0) {
      try {
        const homepageResponse = await axiosInstance.get(normalizedDomain)
        urls = getLinksFromHomepage(homepageResponse.data, normalizedDomain)
      } catch (err) {
        console.error(`Error fetching homepage ${normalizedDomain}:`, err instanceof Error ? err.message : err)
        // Return a minimal result rather than failing completely
        return `Failed to access website at ${normalizedDomain}. Please check if the URL is correct and the site is accessible.`
      }
    }

    // Ensure we have some URLs
    if (!urls || urls.length === 0) {
      return `No crawlable pages found at ${normalizedDomain}. Please check if the URL is correct and the site is accessible.`
    }

    // Limit to just 3 pages to prevent token overflow
    urls = urls.slice(0, 3)
    const allText: string[] = []
    
    for (const url of urls) {
      try {
        const response = await axiosInstance.get(url, {
          timeout: 5000 // Shorter timeout per page
        })
        const $ = cheerio.load(response.data)
        
        // Remove script, style, nav, footer and other non-content elements
        $('script, style, nav, footer, header, .header, .footer, .nav, .menu, .sidebar, aside, .cookie, .cookies, .consent, .newsletter, .popup').remove()
        
        // Only extract important content to avoid token overflow
        const textElements = [
          'h1', 'h2', 'h3', 'p', 
          'article', 'section', 'main',
          '[role="main"]', '[role="article"]',
          '.content', '.main-content'
        ]
        
        // Extract a limited amount of text
        let pageText: string[] = []
        
        textElements.forEach(selector => {
          $(selector).each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length > 20) { // Only meaningful content
              pageText.push(text)
            }
          })
        })
        
        // Limit text per page to avoid token overflow (approximately 2000 tokens)
        allText.push(pageText.join("\n").slice(0, 8000))
        
        if (allText.join("\n\n").length > 24000) {
          // We have enough text, stop crawling
          break
        }
      } catch (err) {
        console.error(`Error crawling ${url}:`, err instanceof Error ? err.message : err)
        // Continue with other URLs rather than failing completely
      }
    }

    if (allText.length === 0) {
      return `Could not extract meaningful content from ${normalizedDomain}. Please check if the URL is correct and the site contains readable content.`
    }

    // Limit final text to avoid token overflow (approximately 12000 tokens)
    return allText.join("\n\n").slice(0, 48000)
  } catch (error) {
    console.error("Crawling error:", error)
    return `Error crawling website: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
} 