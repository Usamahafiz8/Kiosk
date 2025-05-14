import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { SUI_NETWORK, getSigner } from "./config";
import dotenv from "dotenv";

dotenv.config();

const client = new SuiClient({
  url: SUI_NETWORK,
});

export type DisplayFieldsType = {
  keys: string[];
  values: string[];
};

async function createKioskObject(type: string) {
  // Validate environment variables
  const publisherID = process.env.PUBLISHER_ID;
  const packageID = process.env.PACKAGE_ID;
  const adminCapID = process.env.ADMIN_CAP_ID;
  const counterID = process.env.COUNTER_ID;
  const eventID = process.env.EVENT_ID;
  const clockID = "0x6"; // Standard Sui Clock object

  if (!publisherID || !packageID || !adminCapID || !counterID || !eventID) {
    throw new Error(
      "Missing required environment variables. Ensure PUBLISHER_ID, PACKAGE_ID, ADMIN_CAP_ID, COUNTER_ID, and EVENT_ID are set in .env"
    );
  }

  const tx = new Transaction();
  const signer = await getSigner();
  const signerAddress = await signer.toSuiAddress();

  // Step 1: Create Display object
  const displayObject: DisplayFieldsType = {
    keys: ["name", "image_url", "description", "royalty"],
    values: [
      "Monkey King",
      "https://media.voguebusiness.com/photos/61b8dfb99ba90ab572dea0bd/2:3/w_1920,c_limit/adidas-nft-voguebus-adidas-nft-dec-21-story.jpg",
      "Strateg-EYE Guy",
      "5%",
    ],
  };

  tx.setGasBudget(10000000);

  const display = tx.moveCall({
    target: "0x2::display::new_with_fields",
    arguments: [
      tx.object(publisherID),
      tx.pure(bcs.vector(bcs.string()).serialize(displayObject.keys)),
      tx.pure(bcs.vector(bcs.string()).serialize(displayObject.values)),
    ],
    typeArguments: [`${packageID}::nft::Public<${packageID}::nft::${type}>`],
  });

  tx.moveCall({
    target: "0x2::display::update_version",
    arguments: [display],
    typeArguments: [`${packageID}::nft::Public<${packageID}::nft::${type}>`],
  });
  console.log("Step 1: Display created");

  // Step 2: Create a new Kiosk
  const kiosk = tx.moveCall({
    target: "0x2::kiosk::new",
    arguments: [],
  });

  // Share the Kiosk
  tx.moveCall({
    target: "0x2::transfer::public_share_object",
    arguments: [kiosk],
    typeArguments: ["0x2::kiosk::Kiosk"],
  });
  console.log("Step 2: Kiosk created and shared");


    tx.moveCall({
    target: `${packageID}::nft::mint_and_transfer_public`,
    arguments: [
      tx.object(adminCapID),         
      tx.object(eventID),      
      tx.object(counterID),   
      tx.pure.address(`0x1ca83b888a2fbbc05709de821fc814234d8228eb6ef6de125d211f472c7c2f97`), 
      tx.object(clockID),       
    ],
    typeArguments: [`${packageID}::moments::${type}`],
  });
  
  console.log("Step 3: POAP minted");

  // Step 4: Transfer the Display object to the signer
  tx.transferObjects([display], signerAddress);
  console.log("Step 4: Display transfer prepared");

  // Execute the first transaction
  const firstResult = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  console.log("First transaction executed");

  // Check first transaction status
  if (firstResult.effects?.status.status !== "success") {
    throw new Error(`First transaction failed: ${JSON.stringify(firstResult.effects?.status)}`);
  }

  // Extract the Kiosk ID (shared object)
  const kioskID = firstResult.effects?.created?.find(
    (obj) => "Shared" in (obj.owner as any)
  )?.reference.objectId;

  // Extract the POAP ID (owned by signer)
  const poapID = firstResult.effects?.created?.find(
    (obj) => (obj.owner as any)?.AddressOwner === signerAddress
  )?.reference.objectId;

  // Extract the Display ID
  const displayID = firstResult.effects?.created?.find(
    (obj) => (obj.owner as any)?.AddressOwner === signerAddress
  )?.reference.objectId;

  if (!kioskID || !poapID || !displayID) {
    throw new Error("Failed to extract kioskID, poapID, or displayID from first transaction result");
  }

  console.log("Kiosk created successfully:", kioskID);
  console.log("POAP minted:", poapID);
  console.log("Display created successfully:", displayID);
  console.log("First transaction effects:", JSON.stringify(firstResult.effects, null, 2));

  // Second transaction: Place the POAP in the Kiosk
  const secondTx = new Transaction();
  secondTx.setGasBudget(10000000);

  secondTx.moveCall({
    target: "0x2::kiosk::place",
    arguments: [
      secondTx.object(kioskID),
      secondTx.pure.address(signerAddress),
      secondTx.object(poapID),
    ],
    typeArguments: [`${packageID}::nft::Public<${packageID}::nft::${type}>`],
  });
  console.log("Second transaction: POAP place call prepared");

  // Execute the second transaction
  const secondResult = await client.signAndExecuteTransaction({
    transaction: secondTx,
    signer: signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  console.log("Second transaction executed");

  // Check second transaction status
  if (secondResult.effects?.status.status !== "success") {
    throw new Error(`Second transaction failed: ${JSON.stringify(secondResult.effects?.status)}`);
  }

  console.log("POAP placed in kiosk:", poapID);
  console.log("Second transaction effects:", JSON.stringify(secondResult.effects, null, 2));

  return { kioskID, poapID, displayID };
}

// Execute for SuiCreaturesPOAP1
createKioskObject("SuiCreaturesPOAP1").then(console.log).catch(console.error);