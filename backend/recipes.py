from dotenv import load_dotenv # type: ignore
import os
from openai import OpenAI
from dotenv import load_dotenv # type: ignore
import os
from openai import OpenAI
from pydantic import BaseModel
import uvicorn # Needed to run the server

app = FastAPI()

@app.post("/find_ingredients")
async def find_ingredients(recipe):
    result = ollama.generate(
        model='llama3',
        prompt=f'''
        What ingredients do I need to make {recipe}? Return this as a list of items.
        '''
    )
    
    return {"message": result['response']}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

