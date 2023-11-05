import { ethers } from "hardhat";
import * as dotenv from 'dotenv';
import { Ballot__factory, Ballot } from "../typechain-types";
import common from "mocha/lib/interfaces/common";
dotenv.config();

async function main() {

  const parameters = process.argv.slice(2);
  if (!parameters || parameters.length < 2)
  throw new Error("Parameters not provided");
  const contractAddress = parameters[0];
  const delegatedTo = parameters[1];

  //Configuring the provider
  const provider = new ethers.JsonRpcProvider(process.env.RPC_ENDPOINT_URL ?? "");
  const lastBlock = await provider.getBlock('latest');
  console.log(`Last block number: ${lastBlock?.number}`);
  const lastBlockTimestamp = lastBlock?.timestamp ?? 0;
  const lastBlockDate = new Date(lastBlockTimestamp * 1000);
  console.log(`Last block timestamp: ${lastBlockTimestamp} (${lastBlockDate.toLocaleDateString()} ${lastBlockDate.toLocaleTimeString()})`);

  //Configuring the wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider);
  console.log(`Using address ${wallet.address}`);
  const balanceBN = await provider.getBalance(wallet.address);
  const balance = Number(ethers.formatUnits(balanceBN));
  console.log(`Wallet balance ${balance} ETH`);
    if (balance < 0.01) {
    throw new Error("Not enough ether");
    }

  //Attaching the smartcontract using typechain

  const ballotFactory = new Ballot__factory(wallet);
  const ballotContract = ballotFactory.attach(contractAddress) as Ballot;
  const tx = await ballotContract.delegate(delegatedTo);
  const receipt = await tx.wait();
  console.log(`Transaction completed ${receipt?.hash}`)
  }


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
