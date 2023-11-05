import { ethers } from "ethers";
import { Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  // First step is to recieve the parameters from the command line
  const proposals = process.argv.slice(2);
    if (!proposals || proposals.length < 1)
  throw new Error("Proposals not provided");
  console.log("Deploying Ballot contract");
  console.log("Proposals: ");
  proposals.forEach((element, index) => {
    console.log(`Proposal N. ${index + 1}: ${element}`);
  });

  // Second step is to configure the provider in order to connect with the network
  const provider = new ethers.JsonRpcProvider(process.env.RPC_ENDPOINT_URL ?? "");
  // to use the default provider we can use the following line
  // const provider = ethers.getDefaultProvider("sepolia");
  const lastBlock = await provider.getBlock('latest');
  console.log(`Last block number: ${lastBlock?.number}`);
  const lastBlockTimestamp = lastBlock?.timestamp ?? 0;
  const lastBlockDate = new Date(lastBlockTimestamp * 1000);
  console.log(`Last block timestamp: ${lastBlockTimestamp} (${lastBlockDate.toLocaleDateString()} ${lastBlockDate.toLocaleTimeString()})`);

  // Third step is to set up the wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider);
  console.log(`Using address ${wallet.address}`);
  const balanceBN = await provider.getBalance(wallet.address);
  const balance = Number(ethers.formatUnits(balanceBN));
  console.log(`Wallet balance ${balance} ETH`);
  if (balance < 0.01) {
    throw new Error("Not enough ether");
}

// Deploy the contract with typechain
const ballotFactory = new Ballot__factory(wallet);
const ballotContract = await ballotFactory.deploy(
  proposals.map(ethers.encodeBytes32String)
);
await ballotContract.waitForDeployment();
console.log(`Contract deployed to ${ballotContract.target}`);
for (let index = 0; index < proposals.length; index++) {
  const proposal = await ballotContract.proposals(index);
  const name = ethers.decodeBytes32String(proposal.name);
  console.log({ index, name, proposal });
}


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
