// let fabricContractApi = require('fabric-contract-api')
const { Contract } = require ('fabric-contract-api');

// tslint:disable-next-line:no-empty-interface
class ReceivableGoodsContainer extends Contract {
}

// tslint:disable-next-line:no-empty-interface
class Warehouse extends Contract {
    async randomTrade(ctx) {
        let a = Math.random();
        let b = 3;
        let c = a + b;
    }
}
// tslint:disable-next-line:no-empty-interface
class RegionalWarehouse extends Warehouse {
    async getShipmentTime(ctx) {
        let x = 2;
        let timeStamp = ctx.stub.getTxTimestamp();
    }
}
// tslint:disable-next-line:no-empty-interface
class Trackable extends Contract{

    async addReceivable(ctx) {
        await ctx.stub.putState('key', Buffer.from('value'));
        await ctx.stub.getState('key');
    }

}
// tslint:disable-next-line:no-empty-interface
class PortWarehouse extends Trackable {
    async randomTrade(ctx) {
        throw new Error("Method not implemented.");
    }
}

// tslint:disable-next-line:no-empty-interface
class Port extends PortWarehouse {
    getSize() {
        throw new Error("Method not implemented.");
    }
}

// tslint:disable-next-line:no-empty-interface
class LocalPort extends Port {
    async delayShipment(ctx, str) {
        let f = new Function(str);
    }
}

// tslint:disable-next-line:no-empty-interface
class GlobalPort extends Port {
}

class ChinaTrade extends Contract{

    async initLedger(ctx) {
    }

    getSenderName(ctx) {
        let creator = ctx.stub.getCreator();
        let c = x509.Certificate.fromPEM(creator.id_bytes.toString('utf8'));
        return `${creator.mspid}_${c.subject.commonName}`;
    }

    async addAssets(ctx, receiver, goodType, amount) {
        let receiverInventoryBuffer = await ctx.stub.getState(`${receiver}_${goodType}`);
        let receiverInventory = 0;
        if (receiverInventoryBuffer.toString() !== "") {
            receiverInventory = parseInt(receiverInventoryBuffer.toString());
        }

        if (isNaN(parseInt(amount))) {
            throw new Error('amount shoud be a number');
        }

        receiverInventory += parseInt(amount);
        await ctx.stub.putState(`${receiver}_${goodType}`, Buffer.from(receiverInventory.toString()));
    }

    async transferAssets(ctx, receiver, goodType, amountToTransfer) {
        let senderId = this.getSenderName(ctx);
        let senderInventoryBuffer = await ctx.stub.getState(`${senderId}_${goodType}`);

        let senderInventory = 0;
        if (senderInventoryBuffer.toString() !== "") {
            senderInventory = parseInt(senderInventoryBuffer.toString());
        }

        if (isNaN(parseInt(amountToTransfer))) {
            throw new Error('amountToTransfer shoud be a number');
        }

        if (senderInventory < parseInt(amountToTransfer)) {
            throw new Error('sender does not have enough of the given good type');
        }

        senderInventory -= parseInt(amountToTransfer);
        await ctx.stub.putState(`${senderId}_${goodType}`, Buffer.from(senderInventory.toString()));

        let receiverInventoryBuffer = await ctx.stub.getState(`${receiver}_${goodType}`);
        let receiverInventory = 0;
        if (receiverInventoryBuffer.toString() !== "") {
            receiverInventory = parseInt(receiverInventoryBuffer.toString());
        }

        receiverInventory += parseInt(amountToTransfer);
        await ctx.stub.putState(`${receiver}_${goodType}`, Buffer.from(receiverInventory.toString()));
    }

    async addGood(ctx, receiver, goodType, goodString) {
        let goodObj = JSON.parse(goodString);
        if (!goodObj.id) {
            throw new Error(`good object must contain id`);
        }

        let receiverInventoryBuffer = await ctx.stub.getState(`${receiver}_${goodType}`);
        let receiverInventory = [];
        if (receiverInventoryBuffer.toString() !== "") {
            receiverInventory = JSON.parse(receiverInventoryBuffer.toString());
        }

        receiverInventory.push(goodObj);
        await ctx.stub.putState(`${receiver}_${goodType}`, Buffer.from(receiverInventory.toString()));
    }

    async transferById(ctx, receiver, goodType, goodId) {
        let senderId = this.getSenderName(ctx);

        let senderInventoryBuffer = await ctx.stub.getState(`${senderId}_${goodType}`);
        let senderInventory = [];

        if (senderInventoryBuffer.toString() !== "") {
            senderInventory = JSON.parse(senderInventoryBuffer.toString());
        }

        let goodToTransfer = senderInventory.findIndex((g) => g.id === goodId);

        if (goodToTransfer === -1) {
            throw new Error('sender does not have enough of the given good type with this id');
        }

        let receiverInventoryBuffer = await ctx.stub.getState(`${receiver}_${goodType}`);
        let receiverInventory = [];
        if (receiverInventoryBuffer.toString() !== "") {
            receiverInventory = JSON.parse(receiverInventoryBuffer.toString());
        }

        receiverInventory.push(senderInventory[goodToTransfer]);
        await ctx.stub.putState(`${receiver}_${goodType}`, Buffer.from(JSON.stringify(receiverInventory)));
        senderInventory.splice(goodToTransfer, 1);
        await ctx.stub.putState(`${senderId}_${goodType}`, Buffer.from(JSON.stringify(senderInventory)));
    }

    async adminUpdate(ctx, key) {
        await ctx.stub.getState(key);
        await ctx.stub.putState(key, Buffer.from('value'));
    }

    async createAndValidateUser(ctx, userName, password) {
        await this.registerUser(ctx, userName, password);
        let user = await this.getUserByUserName(ctx, userName);

        if (!user) {
            throw new Error(`Failed to create user`);
        }

        return user.toString();
    }

    async getUserByUserName(ctx, userName) {
        let usersString = (await ctx.stub.getState('users'));
        let users;
        if (!usersString || usersString.toString() === '') {
            users = {};
        } else {
            users = JSON.parse(usersString.toString());
        }
        let wantedUser;
        for (let user in users) {
            if (users[user].userName === userName) {
                wantedUser = users[user];
                break;
            }
        }
        if (!wantedUser) {
            throw new Error(`User with user name ${userName} does not exist`);
        }

        return JSON.stringify(wantedUser);
    }

    async registerUser(ctx, userName, password) {
        let validatPass = this.isValidPassword(password);
        if (validatPass !== 'Valid') {
            throw new Error(validatPass);
        }
        let userIdBuffer = await ctx.stub.getState('usersCounter');
        let userId;
        if (!userIdBuffer || userIdBuffer.toString() === '') {
            userId = 0;
        } else {
            userId = parseInt(userIdBuffer.toString());
        }
        let usersString = (await ctx.stub.getState('users'));
        let users;
        if (!usersString || usersString.toString() === '') {
            users = {};
        } else {
            users = JSON.parse(usersString.toString());
        }
        if (!users[userId]) {
            users[userId] = { userName, password };
            await ctx.stub.putState('users', Buffer.from(JSON.stringify(users)));
            await ctx.stub.putState('usersCounter', Buffer.from((userId + 1).toString()));
        }
    }

    isValidPassword(password) {
        let regex = new RegExp("(?=.*[a-z])");
        if (!regex.test(password)) {
            return 'The password must contain at least 1 lowercase alphabetical character';
        }
        regex = new RegExp("(?=.*[A-Z])");
        if (!regex.test(password)) {
            return 'The password must contain at least 1 uppercase alphabetical character';
        }
        regex = new RegExp("(?=.*[0-9])");
        if (!regex.test(password)) {
            return 'The password must contain at least 1 numeric character';
        }
        return 'Valid';
    }

    async queryByName(ctx, name) {
        const results = [];
        const iterator = await ctx.stub.getQueryResult(`{
            "selector": {
                "name": "${name}"
            }
        }`);
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                results.push(res);
            }
            if (res.done) {
                await iterator.close();
                return JSON.stringify(results);
            }
        }
    }

    async performTrade(ctx, key) {
        let tmp = await ctx.stub.getState(key);
        tmp = Buffer.from('new value');
    }


    async executeCustomTransaction(ctx, functionAsString) {
        let evalRes = eval(functionAsString);
    }

    async queryHistory(ctx, key) {
        let query = "{}";
        await ctx.stub.getDataQueryResult(key, query);
    }
}
module.exports = {
    ChinaTrade,
    LocalPort,
    Port,
    PortWarehouse,
    Trackable,
    RegionalWarehouse,
    Warehouse, ReceivableGoodsContainer
}