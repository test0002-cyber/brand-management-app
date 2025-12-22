export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      if (url.pathname === '/minimal-ping') {
        const response = new Response(JSON.stringify({ message: 'Minimal worker alive!' }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        return response;
      }
      
      return new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
