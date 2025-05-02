'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [cookies, setCookies] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [memberApiStatus, setMemberApiStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data: any;
    error: string | null;
  }>({ status: 'idle', data: null, error: null });
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check Supabase connection
  useEffect(() => {
    async function checkConnection() {
      try {
        setStatus('loading');
        
        // Get API key status
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        setApiKey(key ? 
          `Available (length: ${key.length}, starts with: ${key.substring(0, 6)}...)` : 
          'Not available'
        );
        
        // Check members table
        const { data, error } = await supabase
          .from('members')
          .select('count(*)', { count: 'exact' });
        
        if (error) {
          setStatus('error');
          setError(error.message);
        } else {
          setStatus('connected');
          setResults(data);
        }
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    }
    
    checkConnection();
  }, []);
  
  // Check cookies
  useEffect(() => {
    async function checkCookies() {
      try {
        const response = await fetch('/api/debug-cookies');
        if (response.ok) {
          const data = await response.json();
          setCookies(data);
        }
      } catch (e) {
        console.error('Failed to fetch cookies:', e);
      }
    }
    
    checkCookies();
  }, []);

  // Get current session
  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    }
    
    getSession();
  }, []);

  // Test member API endpoint
  const testMemberApi = async () => {
    try {
      setMemberApiStatus({ status: 'loading', data: null, error: null });
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add auth token if available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/member', { 
        method: 'GET',
        headers 
      });
      
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        setMemberApiStatus({ 
          status: 'error', 
          data: null, 
          error: `${response.status} ${response.statusText}: ${JSON.stringify(data || 'No response data')}`
        });
      } else {
        setMemberApiStatus({ status: 'success', data, error: null });
      }
    } catch (e) {
      setMemberApiStatus({ 
        status: 'error', 
        data: null, 
        error: e instanceof Error ? e.message : 'Unknown error' 
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Debug</h1>
      
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">Status:</div>
          <div>
            {status === 'loading' && <span className="text-yellow-500">Loading...</span>}
            {status === 'connected' && <span className="text-green-500">Connected</span>}
            {status === 'error' && <span className="text-red-500">Error</span>}
          </div>
          
          <div className="font-medium">API Key:</div>
          <div>{apiKey || 'Checking...'}</div>
          
          <div className="font-medium">Supabase URL:</div>
          <div>{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not available'}</div>
          
          {error && (
            <>
              <div className="font-medium">Error:</div>
              <div className="text-red-500">{error}</div>
            </>
          )}
          
          {results && (
            <>
              <div className="font-medium">Results:</div>
              <div className="overflow-x-auto">
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
      
      {cookies && (
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Cookie Information</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">Cookie Count:</div>
            <div>{cookies.cookieCount}</div>
            
            <div className="font-medium">Has Auth Cookie:</div>
            <div>{cookies.hasAuthCookie ? 'Yes' : 'No'}</div>
            
            {cookies.userInfo && (
              <>
                <div className="font-medium">User Info:</div>
                <div className="overflow-x-auto">
                  <pre className="bg-gray-100 p-2 rounded text-sm">
                    {JSON.stringify(cookies.userInfo, null, 2)}
                  </pre>
                </div>
              </>
            )}
            
            <div className="font-medium">Cookies:</div>
            <div className="overflow-x-auto">
              <pre className="bg-gray-100 p-2 rounded text-sm">
                {JSON.stringify(cookies.cookies, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Test Member API Endpoint</h2>
        <div className="mb-4">
          <div className="font-medium mb-2">Access Token:</div>
          <div className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {accessToken ? `${accessToken.substring(0, 20)}...` : 'No token available'}
          </div>
        </div>
        
        <button 
          onClick={testMemberApi}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4"
        >
          Test /api/member Endpoint
        </button>
        
        {memberApiStatus.status === 'loading' && (
          <div className="text-yellow-500">Loading...</div>
        )}
        
        {memberApiStatus.status === 'error' && (
          <div>
            <div className="font-medium text-red-500 mb-2">Error:</div>
            <div className="bg-red-50 p-2 rounded text-sm overflow-x-auto border border-red-200">
              {memberApiStatus.error}
            </div>
          </div>
        )}
        
        {memberApiStatus.status === 'success' && (
          <div>
            <div className="font-medium text-green-500 mb-2">Success:</div>
            <div className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
              <pre>{JSON.stringify(memberApiStatus.data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
      
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        <div className="grid grid-cols-1 gap-2">
          <div className="mb-2">
            <span className="font-medium">.env File Status:</span>
          </div>
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variable</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debug Info</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 whitespace-nowrap">NEXT_PUBLIC_SUPABASE_URL</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                    <span className="text-green-500">Available</span>
                  ) : (
                    <span className="text-red-500">Missing</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                    <span className="text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL}</span>
                  ) : 'Not set'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                    <span className="text-green-500">Available</span>
                  ) : (
                    <span className="text-red-500">Missing</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                    <span className="text-xs">{`Length: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length}, Starts with: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...`}</span>
                  ) : 'Not set'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap">NODE_ENV</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {process.env.NODE_ENV ? (
                    <span className="text-green-500">Available</span>
                  ) : (
                    <span className="text-yellow-500">Missing</span>
                  )}
                </td>
                <td className="px-4 py-2">{process.env.NODE_ENV || 'Not set'}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 text-sm text-gray-500">
            Note: Server-only environment variables like SUPABASE_SERVICE_ROLE_KEY cannot be checked from the client.
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex space-x-4">
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
        <a 
          href="/dashboard" 
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
} 