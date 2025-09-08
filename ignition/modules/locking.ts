
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

const ECMcoinLocking_Module = buildModule("ECMCoinLocking_Module", (m) => {
  // ECM token address parameter
  const ecmToken = m.getParameter("ecmToken", "0x4C324169890F42c905f3b8f740DBBe7C4E5e55C0");

  // Deploy ECMcoinLocking contract
  const ecmcoinLocking = m.contract("ECMcoinLocking", [ecmToken]);

  return { ecmcoinLocking };
});

export default ECMcoinLocking_Module;