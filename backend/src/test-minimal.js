import { Router } from 'itty-router';

const router = Router();

// Test if router works
router.get('/test', () => {
  return new Response(JSON.stringify({ message: 'Router works!' }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

export default {
  async fetch(request, env) {
    try {
      const response = await router.handle(request, env);
      return response || new Response('No response', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
