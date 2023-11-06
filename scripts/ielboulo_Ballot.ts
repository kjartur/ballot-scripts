import { expect } from "chai";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index = 0; index < array.length; index++) {
      bytes32Array.push(ethers.encodeBytes32String(array[index]));
    }
    return bytes32Array;
  }

  const PROPOSALS = ["prop1", "prop2", "prop3"];
  
  async function deployContract() {
    const signers = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot");
    const ballotContract = await ballotFactory.deploy(
      convertStringArrayToBytes32(PROPOSALS)
    );
    await ballotContract.waitForDeployment();
    return {signers, ballotContract};
  }

describe("Ballot", async () => {

  describe("when the contract is deployed", async () => {

    it("has the provided proposals", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        for (let index = 0; index < PROPOSALS.length; index++) {
          const proposal = await ballotContract.proposals(index);
          expect(ethers.decodeBytes32String(proposal.name)).to.eq(
            PROPOSALS[index]
          );
        }
      });

      it("has zero votes for all proposals", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        for (let index = 0; index < PROPOSALS.length; index++) {
          const proposal = await ballotContract.proposals(index);
          expect(proposal.voteCount).to.eq(0);
        }
    });
  
    it("sets the deployer address as chairperson", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const deployerAddress = signers[0].address;
        const chairpersonnAddress = await ballotContract.chairperson();
        expect(deployerAddress).to.eq(chairpersonnAddress);
    });

    it("sets the voting weight for the chairperson as 1", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const deployerAddress = signers[0].address;
        const chairpersonnAddress = await ballotContract.chairperson();
        expect(deployerAddress).to.eq(chairpersonnAddress);

        const votersM = await ballotContract.voters(chairpersonnAddress);
        expect(votersM.weight).to.eq(1);

    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", async () => {
    it("gives right to vote for another address", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const chairpersonnAddress = await ballotContract.chairperson();

        await ballotContract.giveRightToVote(signers[1].address);

        const votersS1 = await ballotContract.voters(signers[1].address);
        expect(votersS1.weight).to.eq(1);

        const votersS2 = await ballotContract.voters(signers[2].address);
        expect(votersS2.weight).to.eq(0);
    });

    it("can not give right to vote for someone that has voted", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const chairpersonnAddress = await ballotContract.chairperson();

        const voter1 = signers[1];
        await ballotContract.giveRightToVote(voter1.address); // give right 1st time

        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        // vote of signers 1 :
        const proposalIndex =0;
        await ballotContract.connect(voter1).vote(proposalIndex); // voted

        await expect(
              ballotContract.giveRightToVote(voter1.address) // give right 2d time
              ).to.be.revertedWith('The voter already voted.');
            });

    it("can not give right to vote for someone that has already voting rights", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const chairpersonnAddress = await ballotContract.chairperson();

        const voter1 = signers[1];
        await ballotContract.giveRightToVote(voter1.address); // give right 1st time

        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        await expect(
              ballotContract.giveRightToVote(voter1.address) // give right 2d time
           ).to.be.reverted;
    });
  });

  describe("when the voter interacts with the vote function in the contract", async () => {
    it("should register the vote", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const chairpersonnAddress = await ballotContract.chairperson();

        const voter1 = signers[1];
        await ballotContract.giveRightToVote(voter1.address); // give right 1st time

        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        // vote of signers 1 :
        const proposalIndex =0;
        await ballotContract.connect(voter1).vote(proposalIndex); // voted

        for (let index = 0; index < PROPOSALS.length; index++) {
            const proposal = await ballotContract.proposals(index);
            if(index == proposalIndex)
            {
                expect(proposal.voteCount).to.eq(1);
            }
            else{
                expect(proposal.voteCount).to.eq(0);
            }
          }

    });
  });

  describe("when the voter interacts with the delegate function in the contract", async () => {
    it("should transfer voting power", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const voter1 = signers[1];
        const voter2 = signers[2];

        await ballotContract.giveRightToVote(voter1.address);
        await ballotContract.giveRightToVote(voter2.address); 

        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        const votersS2 = await ballotContract.voters(voter2.address);
        expect(votersS2.weight).to.eq(1);

        // delegate :

        await ballotContract.connect(voter1).delegate(voter2); // voted

        const votersD = await ballotContract.voters(voter2.address);
        expect(votersD.weight).to.eq(2); // weight incrmented after vote

    });
  });

  describe("when an account other than the chairperson interacts with the giveRightToVote function in the contract", async () => {
    it("should revert", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const chairpersonnAddress = await ballotContract.chairperson();
        
        const voter1 = signers[1];

        await expect(
            ballotContract.connect(voter1).giveRightToVote(voter1.address) // give right 2d time
            ).to.be.revertedWith("Only chairperson can give right to vote.");
    });
  });

  describe("when an account without right to vote interacts with the vote function in the contract", async () => {
    it("should revert", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const voter3 = signers[3];
        const proposalIndex =0;
        await expect(
            ballotContract.connect(voter3).vote(proposalIndex) 
            ).to.be.revertedWith("Has no right to vote");
    });
  });

  describe("when an account without right to vote interacts with the delegate function in the contract", async () => {
    it("should revert", async () => {

        const {signers, ballotContract} = await loadFixture(deployContract);
        const voter1 = signers[1];
        const voter2 = signers[2];

        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(0);

        // delegate :
        await expect(
            ballotContract.connect(voter1).delegate(voter2)
            ).to.be.revertedWith('You have no right to vote');

        });
  });

  describe("when someone interacts with the winningProposal function before any votes are cast", async () => {
    it("should return 0", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const winningProposalIndex = await ballotContract.winningProposal();
        expect(winningProposalIndex).to.equal(0); 
     });
  });

  describe("when someone interacts with the winningProposal function after one vote is cast for the first proposal", async () => {
    it("should return 1", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);

        const voter1 = signers[1];
        await ballotContract.giveRightToVote(voter1.address); // give right 1st time
        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        // vote of signers 1 :
        const proposalIndex =0;
        await ballotContract.connect(voter1).vote(proposalIndex); // voted

        const winningProposalIndex = await ballotContract.winningProposal();
        expect(winningProposalIndex).to.equal(proposalIndex); 
    });
  });

  describe("when someone interacts with the winnerName function before any votes are cast", async () => {
    it("should return name of proposal 0", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);
        const winningProposalNameBytes32 = await ballotContract.winnerName();
        const winningProposalName = ethers.decodeBytes32String(winningProposalNameBytes32);
        expect(winningProposalName).to.equal("prop1");
        });
  });

  describe("when someone interacts with the winnerName function after one vote is cast for the first proposal", async () => {
    it("should return name of proposal 0", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);

        const voter1 = signers[1];
        await ballotContract.giveRightToVote(voter1.address); // give right 1st time
        const votersS1 = await ballotContract.voters(voter1.address);
        expect(votersS1.weight).to.eq(1);

        // vote of signers 1 :
        const proposalIndex =0;
        await ballotContract.connect(voter1).vote(proposalIndex); // voted

        // get winner name :
        const winningProposalNameBytes32 = await ballotContract.winnerName();
        const winningProposalName = ethers.decodeBytes32String(winningProposalNameBytes32);
        expect(winningProposalName).to.equal("prop1");
    
    });
  });

  describe("when someone interacts with the winningProposal function and winnerName after 5 random votes are cast for the proposals", async () => {
    it("should return the name of the winner proposal", async () => {
        const {signers, ballotContract} = await loadFixture(deployContract);

        for (let index = 1; index < 6; index++) {

            const voter = signers[index];
            await ballotContract.giveRightToVote(voter.address); // give right 1st time
            const voters = await ballotContract.voters(voter.address);
            expect(voters.weight).to.eq(1);
    
            // vote of signers 1 :
            const proposalIndex =1;
            await ballotContract.connect(voter).vote(proposalIndex); // voted
        }
        // get winner name :
        const winningProposalNameBytes32 = await ballotContract.winnerName();
        const winningProposalName = ethers.decodeBytes32String(winningProposalNameBytes32);
        expect(winningProposalName).to.equal("prop2");

    });
  });
});
