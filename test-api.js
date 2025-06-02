// Test script to verify the API fix
const API_BASE = 'http://207.180.240.156:3000';
const API_KEY = 'Uaapo3ihgoarfboufba';

async function testTodoCheck() {
  try {
    console.log('Testing todo check API...');
    
    const response = await fetch(`${API_BASE}/api/todos/19/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        completed: true
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Test getting todos first
async function testGetTodos() {
  try {
    console.log('Testing get todos API...');
    
    const response = await fetch(`${API_BASE}/api/todos`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Todos:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testGetTodos();
  console.log('\n---\n');
  await testTodoCheck();
}

runTests();