 
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import dotenv from "dotenv";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Configure dotenv
dotenv.config();

// Configuration
const SUI_NETWORK: string = process.env.SUI_NETWORK || "https://fullnode.testnet.sui.io";
const client: SuiClient = new SuiClient({ url: SUI_NETWORK });

// Interface for transaction result
interface TransactionResult {
  kioskID: string;
  poapID: string;
  kioskOwnerCapID: string;
}

// Interface for Sui object owner
interface SuiObjectOwner {
  AddressOwner?: string;
  Shared?: { initial_shared_version: number };
}

// Interface for transaction effects
interface TransactionEffects {
  status: { status: string; error?: string };
  created?: Array<{ owner: SuiObjectOwner; reference: { objectId: string } }>;
}

// Utility function to derive signer from mnemonic
async function getSigner(): Promise<Ed25519Keypair> {
  const mnemonic: string | undefined = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("MNEMONIC not set in .env");
  }
  const keypair: Ed25519Keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  return keypair;
}

// Utility function to verify POAP ownership
async function verifyPoapOwnership(poapID: string, signerAddress: string): Promise<string> {
  try {
    const poap: SuiObjectResponse = await client.getObject({
      id: poapID,
      options: { showOwner: true, showType: true },
    });
    console.log("POAP Object:", JSON.stringify(poap, null, 2));
    if (!poap.data) {
      throw new Error(`POAP ${poapID} does not exist`);
    }
    const owner = poap.data.owner as SuiObjectOwner;
    if (owner.AddressOwner !== signerAddress) {
      throw new Error(`POAP ${poapID} is not owned by ${signerAddress}`);
    }
    const poapType: string = poap.data.type!;
    console.log("POAP Type:", poapType);
    return poapType;
  } catch (error: unknown) {
    console.error("Error verifying POAP:", error);
    throw error;
  }
}

// Main function to place object in kiosk
async function placeObjectInKiosk(): Promise<TransactionResult> {
  const packageID: string | undefined = process.env.PACKAGE_ID;
  if (!packageID) {
    throw new Error("Missing PACKAGE_ID in .env");
  }

  const signer: Ed25519Keypair = await getSigner();
  const signerAddress: string = await signer.toSuiAddress();
  const poapID: string = "0xacf807e3c0cd89684c1585ed083cf6aad87e5cb9c78212212072330356a82286";

  // Verify POAP ownership and type
  console.log("Signer Address:", signerAddress);
  const poapType: string = await verifyPoapOwnership(poapID, signerAddress);

  // Step 1: Create and share Kiosk (first transaction)
  const tx1: Transaction = new Transaction();
  tx1.setGasBudget(100000000);
  const kioskResult = tx1.moveCall({
    target: "0x2::kiosk::new",
    arguments: [],
  });
  console.log("Step 1: Kiosk created", kioskResult);

  const kiosk = tx1.object(kioskResult[0]);
  tx1.moveCall({
    target: "0x2::transfer::public_share_object",
    arguments: [kiosk],
    typeArguments: ["0x2::kiosk::Kiosk"],
  });
  console.log("Step 2: Kiosk shared");

  const kioskOwnerCap = tx1.object(kioskResult[1]);
  tx1.transferObjects([kioskOwnerCap], signerAddress);
  console.log("Step 3: KioskOwnerCap transfer prepared");

  // Log transaction block for debugging
  console.log("Transaction 1 Block:", JSON.stringify(tx1, null, 2));

  const result1 = await client.signAndExecuteTransaction({
    transaction: tx1,
    signer: signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  console.log("Transaction 1 executed");
// @ts-ignore
const effects1: TransactionEffects | undefined = result1.effects;
if (effects1?.status.status !== "success") {
    throw new Error(`Transaction 1 failed: ${JSON.stringify(effects1?.status)}`);
}

const kioskID: string | undefined = effects1?.created?.find(
    (obj) => "Shared" in (obj.owner || {})
)?.reference.objectId;

const kioskOwnerCapID: string | undefined = effects1?.created?.find(
    (obj) => obj.owner?.AddressOwner === signerAddress
)?.reference.objectId;

if (!kioskID || !kioskOwnerCapID) {
    throw new Error("Failed to extract kioskID or kioskOwnerCapID from Transaction 1");
}

console.log("Kiosk created successfully:", kioskID);
console.log("KioskOwnerCap created successfully:", kioskOwnerCapID);
console.log("Transaction 1 effects:", JSON.stringify(effects1, null, 2));

// Step 2: Place POAP in Kiosk (second transaction)
const tx2: Transaction = new Transaction();
tx2.setGasBudget(100000000);
tx2.moveCall({
    target: "0x2::kiosk::place",
    arguments: [
        tx2.object(kioskID), // Use the shared Kiosk ID
        tx2.object(kioskOwnerCapID),
        tx2.object(poapID),
    ],
    typeArguments: [poapType],
});
console.log("Step 4: POAP placed in kiosk");

// Log transaction block for debugging
console.log("Transaction 2 Block:", JSON.stringify(tx2, null, 2));

const result2 = await client.signAndExecuteTransaction({
    transaction: tx2,
    signer: signer,
    options: {
        showEffects: true,
        showObjectChanges: true,
    },
  });
  console.log("Transaction 2 executed");
  
  // @ts-ignore
  const effects2: TransactionEffects | undefined = result2.effects;
  if (effects2?.status.status !== "success") {
      throw new Error(`Transaction 2 failed: ${JSON.stringify(effects2?.status)}`);
    }
    
    console.log("POAP placed in kiosk:", poapID);
    console.log("Transaction 2 effects:", JSON.stringify(effects2, null, 2));
    
    return { kioskID, poapID, kioskOwnerCapID };
}

// Execute
placeObjectInKiosk().then(console.log).catch(console.error);