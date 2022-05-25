const Observable = require('./Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

class MessageDispatcher extends Observable {
    
    static #dispatchers = {}
    static authenticate (senderAgent) {
        if (!(senderAgent.name in this.#dispatchers))
            this.#dispatchers[senderAgent.name] = new MessageDispatcher(senderAgent.name)
        return this.#dispatchers[senderAgent.name]
    }

    constructor (name) {
        super({newMessageReceived: false})
        this.name = name
        this.received = []
    }
    
    pushMessage (goal) {
        this.newMessageReceived = true
        this.received.push(goal)
    }
    
    readMessage () {
        this.newMessageReceived = false
        return this.received.pop()
    }
    
    async sendTo (to, goal) {
        if (!to in this.constructor.#dispatchers)
            this.constructor.#dispatchers[to] = new MessageDispatcher(to)
        this.constructor.#dispatchers[to].pushMessage(goal)
        return goal.notifyChange('achieved')
    }

}


class Postman extends Goal {
}

class PostmanAcceptAllRequest extends Intention {
    static applicable (goal) {
        return goal instanceof Postman
    }
    *exec (parameters) {
        var myMessageDispatcher = MessageDispatcher.authenticate(this.agent)
        while (true) {
            yield myMessageDispatcher.notifyChange('newMessageReceived')
            let newMessage = myMessageDispatcher.readMessage()
            if (newMessage && newMessage instanceof Goal) {
                this.log('Reading received message', newMessage.toString())
                // console.log(newMessage)
                yield this.agent.postSubGoal(newMessage)
            }
        }
    }
}


module.exports = {MessageDispatcher, Postman, PostmanAcceptAllRequest}