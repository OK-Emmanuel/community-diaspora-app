'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { postsApi } from '@/lib/api';
import Link from 'next/link';
import type { Post, PostWithAuthor } from '@/types/database';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const postsPerPage = 5;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchPosts();
    }
  }, [user, authLoading, router, currentPage]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      
      const data = await postsApi.getPosts(currentPage, postsPerPage);
      
      setPosts(data as PostWithAuthor[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get full name from author object
  const getAuthorName = (author: { first_name?: string; last_name?: string } | null | undefined) => {
    if (!author) return 'Unknown';
    return `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Unknown';
  };

  // Helper function to get author initials
  const getAuthorInitials = (author: { first_name?: string; last_name?: string } | null | undefined) => {
    if (!author) return '?';
    const firstInitial = author.first_name ? author.first_name.charAt(0) : '?';
    const lastInitial = author.last_name ? author.last_name.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase() || '?';
  };

  const handleLike = async (postId: string) => {
    try {
      // Find the post in the state
      const postIndex = posts.findIndex(post => post.id === postId);
      if (postIndex === -1) return;
      
      // Optimistically update the UI
      const updatedPosts = [...posts];
      updatedPosts[postIndex].likes_count += 1;
      setPosts(updatedPosts);
      
      // Update the post likes in the database
      const { error } = await postsApi.likePost(postId, updatedPosts[postIndex].likes_count);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert the optimistic update
      fetchPosts();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Community Feed</h1>
            <Link 
              href="/feed/create" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Post
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-500 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {posts.length === 0 && !isLoading && !error ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-500">No posts found. Be the first to create a post!</p>
                <Link 
                  href="/feed/create" 
                  className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Post
                </Link>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm overflow-hidden">
                        {post.author?.profile_image_url ? (
                          <img 
                            src={post.author.profile_image_url} 
                            alt={`${getAuthorName(post.author)}'s profile`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If image fails to load, display initials instead
                              (e.target as HTMLImageElement).style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = getAuthorInitials(post.author);
                            }}
                          />
                        ) : (
                          <span>{getAuthorInitials(post.author)}</span>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {getAuthorName(post.author)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleString()}
                        </p>
                      </div>
                      {post.is_pinned && (
                        <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pinned
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/feed/post/${post.id}`}>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
                        {post.title}
                      </h2>
                    </Link>
                    
                    <div className="prose max-w-none mb-4">
                      {/* Show truncated content on feed */}
                      <p className="text-gray-700">
                        {post.content.length > 200 
                          ? `${post.content.substring(0, 200)}...` 
                          : post.content}
                      </p>
                    </div>
                    
                    {post.image_url && (
                      <div className="mb-4">
                        <img 
                          src={post.image_url} 
                          alt={post.title}
                          className="rounded-lg max-h-96 w-auto mx-auto"
                          onError={(e) => {
                            // Hide the image if it fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex space-x-4">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className="flex items-center text-sm text-gray-500 hover:text-blue-600"
                        >
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>{post.likes_count}</span>
                        </button>
                        
                        <Link 
                          href={`/feed/post/${post.id}`}
                          className="flex items-center text-sm text-gray-500 hover:text-blue-600"
                        >
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{post.comments_count}</span>
                        </Link>
                      </div>
                      
                      <Link
                        href={`/feed/post/${post.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Read more
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Pagination */}
            {posts.length > 0 && (
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={posts.length < postsPerPage}
                  className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    posts.length < postsPerPage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 