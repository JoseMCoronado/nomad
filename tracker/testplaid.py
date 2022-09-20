import requests

url = "http://localhost:3000/transactions/get"

r = requests.get(url)
print(r.json())
