import type { Metadata } from 'next';

interface Props {
  params: { postId: string };
  children: React.ReactNode;
}

async function getPost(postId: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/api/posts/${postId}`, {
      cache: 'no-store' // Ensure fresh data for metadata
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching post for metadata:', error);
    return null;
  }
}

function extractTitle(post: any): string {
  if (!post) return 'Travel Story';
  
  // Try trip name first
  if (post.tripName) return post.tripName;
  
  // Try to extract from content
  if (post.content) {
    try {
      const contentObj = typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
      const firstBlock = contentObj?.content?.[0];
      
      if (firstBlock?.type === 'heading' && firstBlock?.content?.[0]?.text) {
        return firstBlock.content[0].text;
      }
      
      if (firstBlock?.type === 'paragraph' && firstBlock?.content?.[0]?.text) {
        const text = firstBlock.content[0].text;
        return text.length > 60 ? text.substring(0, 60) + '...' : text;
      }
    } catch (e) {
      console.error('Error parsing content for title:', e);
    }
  }
  
  return 'Travel Story';
}

function extractDescription(post: any): string {
  if (!post?.content) return 'Share your travel experiences on Odyssey';
  
  try {
    const contentObj = typeof post.content === 'string' ? JSON.parse(post.content) : post.content;
    const blocks = contentObj?.content || [];
    
    // Find first paragraph with text
    for (const block of blocks) {
      if (block?.type === 'paragraph' && block?.content?.[0]?.text) {
        const text = block.content[0].text;
        return text.length > 160 ? text.substring(0, 160) + '...' : text;
      }
    }
  } catch (e) {
    console.error('Error parsing content for description:', e);
  }
  
  return 'Share your travel experiences on Odyssey';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.postId);
  const title = extractTitle(post);
  const description = extractDescription(post);
  const author = post?.authorId?.username || 'Odyssey Traveler';
  const imageUrl = post?.authorId?.profilePicture || 'https://via.placeholder.com/1200x630?text=Odyssey+Travel';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/feed/${params.postId}`;
  
  return {
    title: `${title} - Odyssey Travel`,
    description: description,
    authors: [{ name: author }],
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: 'Odyssey Travel',
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

export default function PostLayout({ children }: Props) {
  return children;
}
