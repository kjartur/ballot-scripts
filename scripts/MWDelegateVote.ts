import { ethers } from "ethers";
import * as dotenv from 'dotenv';
import { Ballot, Ballot__factory } from "../typechain-types";
dotenv.config();

async function main() {
        // Receiving paramters
        const parameters = process.argv.slice(2);
        if (!parameters || parameters.length < 2)
          throw new Error("Parameters not provided");
        const contractAddress = parameters[0];
        const delegationAddress = parameters[1];

  //Congfiguring Provider
  const provider = new ethers.JsonRpcProvider(process.env.RPC_ENDPOINT_URL ?? "https://sepolia.gateway.pokt.network/v1/lb/1a873e75");
  const lastBlock = await provider.getBlock('latest');
  console.log(`Last block number: ${lastBlock?.number}`);
  const lastBlockTimestamp = lastBlock?.timestamp ?? 0;
  const lastBlockDate = new Date(lastBlockTimestamp * 1000);
  console.log(`Last block timestamp: ${lastBlockTimestamp} (${lastBlockDate.toLocaleDateString()} 
  ${lastBlockDate.toLocaleTimeString()})`);


    //Configuring wallet
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider);;
console.log(`Using address ${wallet.address}`);
const balanceBN = await provider.getBalance(wallet.address);
const balance = Number(ethers.formatUnits(balanceBN));
console.log(`Wallet balance ${balance} ETH`);
if (balance < 0.01) {
  throw new Error("Not enough ether");
}
    // Attach Contract using Typechain
    const ballotFactory = new Ballot__factory(wallet);
    const ballotContract = ballotFactory.attach(contractAddress) as Ballot;
    const tx = await ballotContract.delegate(delegationAddress);
    const receipt = await tx.wait();
    console.log(`Transaction completed ${receipt?.hash}`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
