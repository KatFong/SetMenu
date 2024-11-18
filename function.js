const functions = require('@google-cloud/functions-framework');
const cors = require('cors')();

functions.http('geminiProxy', async (req, res) => {
  // 啟用 CORS
  cors(req, res, async () => {
    try {
      const { budget, people, notes, ingredients } = req.body;
      
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate a catering menu with the following requirements:
                  Budget: ${budget} HKD
                  Number of people: ${people}
                  ${notes ? `Special notes: ${notes}` : ''}
                  ${ingredients ? `Available ingredients: ${ingredients}` : ''}
                  Requirements:
                  1. Suitable for catering events
                  2. Include price and quantity for each dish
                  3. Consider cost efficiency
                  
                  Response in Chinese. Use this JSON format only:
                  {
                    "menu": [
                      {
                        "name": "中文菜名",
                        "price": number,
                        "quantity": number
                      }
                    ],
                    "totalPrice": number,
                    "recommendedPeople": ${people},
                    "notes": "中文建議說明"
                  }`
              }]
            }]
          })
        }
      );

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}); 