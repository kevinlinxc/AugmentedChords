# AugmentOS-Cloud-Example-App


![header](https://github.com/user-attachments/assets/f69defec-7011-45f2-b258-94e6c712a758)

### Download AugmentOS on your phone

[Download links](https://drive.google.com/drive/folders/1l99ffBiWHnAe06HSJcgjIG-SnMuio70_?usp=sharing)

You *probably* want staging, unless you want raw audio bytes. If you want raw audio bytes, you want dev.

### Set up ngrok

1. `brew install ngrok`

2. Make an ngrok account

3. [Use ngrok to make a static address/URL](https://dashboard.ngrok.com/)

### Register your APP with AugmentOS

<img width="181" alt="image" src="https://github.com/user-attachments/assets/36192c2b-e1ba-423b-90de-47ff8cd91318" />

1. Navigate to [AugmentOS.dev](https://augmentos.dev/)

2. Click "Sign In", and log in with the same Google account you're using for AugmentOS

3. Click "Create App"

4. Set a UNIQUE package name like `org.yourlastname.yoursocialsecuritynumber`

5. For webhook url, enter your ngrok's static url, appended by `webhook`
    * EX: 
        * If you Ngrok URL is: `https://my-static-url.ngrok-free.app`
        * Then you enter `https://my-static-url.ngrok-free.app/webhook`

![guide](https://github.com/user-attachments/assets/681df211-ea1a-4fd9-9563-f1f7c81e9565)

### Get your APP running!

1. [Install bun](https://bun.sh/docs/installation)

2. Clone this repo: `git clone git@github.com:AugmentOS-Community/AugmentOS-Cloud-Example-App.git`

3. cd into your repo, then type `bun install`

4. Edit your `index.ts` to match the app you registered at [AugmentOS.dev](https://augmentos.dev/)
    
```typescript
const app = new ExampleAugmentOSApp({
  packageName: 'org.kese.augmentedchords2', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, can be anything
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws' //AugmentOS url
});
```

7. Run your app with `bun run index.ts`

8. To expose your app to the internet (and thus AugmentOS) with ngrok, run: `ngrok http --url=civil-frankly-javelin.ngrok-free.app 3000`
    * `3000` is the port. It must match what is in the app config. If you entered `port: 8080`, use `8080` for ngrok instead.
