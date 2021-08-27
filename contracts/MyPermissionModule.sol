// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.5.0 <0.7.0;

import "@gnosis.pm/safe-contracts/contracts/base/Module.sol";
import "@gnosis.pm/safe-contracts/contracts/base/OwnerManager.sol";


interface GnosisSafe {
    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, Enum.Operation operation)
        external
        returns (bool success);
}


// Reference: https://github.com/CirclesUBI/safe-contracts/blob/master/contracts/modules/WhitelistModule.sol
contract MyPermissionModule is Module{

    string public constant NAME = "My Permission Module";
    string public constant VERSION = "0.1.0";

    address public admin;
    mapping(address => bool) assistants;

    struct PermissionDetail{
        bool granted;
        uint expireDate;
        uint allowanceAmount;
    }
    // isWhitelisted mapping maps destination address to boolean.
    mapping(address => mapping(address => PermissionDetail)) public isWhitelisted;

    modifier onlyAdmin{
        require(
            msg.sender == admin,
            "Only admin can call this function."
        );
        _;
    }

    modifier onlyAdminOrAssistant {
        require(
            assistants[msg.sender] == true || msg.sender == admin,
            "Only admin or assistant can call this function."
        );
        _;
    }

    
    function setup(address _admin, address[] memory newAssistants)
        public
    {
        setManager();
        admin = _admin;
        // assign assistant
        for (uint256 i = 0; i < newAssistants.length; i++) {
            address assistant = newAssistants[i];
            require(assistant != address(0), "Invalid assistant account provided");
            assistants[assistant] = true;
        }
    }

    function setAssistant(address assistant, bool value)
        public
        onlyAdmin
    {
        require(assistant != address(0), "Invalid account provided");
        assistants[assistant] = value;
    }

    /// @dev Allows to add destination to whitelist. This can only be done by admin.
    /// @param account Destination address.
    function updatePermission(address assistant, address account, bool granted, uint expireDate, uint allowanceAmount, uint oldAllowanceAmount)
        public
        onlyAdmin
    {
        PermissionDetail storage permissionDetail = isWhitelisted[assistant][account];
        require(permissionDetail.allowanceAmount == oldAllowanceAmount);
        require(account != address(0), "Invalid account provided");
        permissionDetail.granted = granted;
        permissionDetail.expireDate = expireDate;
        permissionDetail.allowanceAmount = allowanceAmount;
    }





    function executeByAssistantWhitelisted(address to, uint256 value, bytes memory data)
        public
        onlyAdminOrAssistant
        returns (bool)
    {
        address sender = msg.sender;
        require(OwnerManager(address(manager)).isOwner(sender), "Method can only be called by an owner");

        if(sender != admin){
            PermissionDetail storage permissionDetail = isWhitelisted[sender][to];
            // validate the permissions
            require(permissionDetail.granted == true, "Target account is not granted");
            require(permissionDetail.expireDate >= block.timestamp, "Permission has been expired");
            require(permissionDetail.allowanceAmount >= value, "Allowance Amount is not enough");
            permissionDetail.allowanceAmount -= value;
        }
        require(manager.execTransactionFromModule(to, value, data, Enum.Operation.Call), "Could not execute transaction");
    }


}