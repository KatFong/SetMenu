require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.AIzaSyCl78ysJGjkonNy8Ly-rpZJuB5bA2DYeJs;

app.post('/api/generate-menu', async (req, res) => {
    try {
        const { budget } = req.body;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "contents": [{
                        "parts":[{
                            "text": `作為一個餐飲專家，請根據以下要求生成到會餐單：
                                預算：${budget} HKD
                                要求：
                                1. 符合香港人口味
                                2. 適合宴會使用
                                3. 每道菜都需要包含價格和建議份量
                                4. 計算適合的用餐人數
                                
                                請用以下JSON格式回應：
                                {
                                    "menu": {
                                        "appetizers": [
                                            {"name": "菜名", "price": 數字, "quantity": 數字}
                                        ],
                                        "mainCourses": [
                                            {"name": "菜名", "price": 數字, "quantity": 數字}
                                        ],
                                        "desserts": [
                                            {"name": "菜名", "price": 數字, "quantity": 數字}
                                        ]
                                    },
                                    "totalPrice": 數字,
                                    "recommendedPeople": 數字,
                                    "notes": "建議說明"
                                }`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const textContent = data.candidates[0].content.parts[0].text;
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        const menuData = JSON.parse(jsonMatch[0]);
        
        res.json(menuData);
    } catch (error) {
        console.error('API 錯誤:', error);
        res.status(500).json({ error: '生成餐單時發生錯誤' });
    }
});

app.listen(port, () => {
    console.log(`服務器運行於 http://localhost:${port}`);
}); 