import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
	console.log(chalk.bold.green('Server is running on port 5000'));
});

let database = null;
const mongocliente = new MongoClient('mongodb://127.0.0.1:27017/');
mongocliente
	.connect()
	.then(() => {
		database = mongocliente.db('bate-papo-uol');
		console.log(chalk.bold.blue('Connected to database'));
	})
	.catch((err) => {
		console.log(err);
	});

app.post('/participants', async (req, res) => {
	const { name } = req.body;
	const userSchema = joi.object({
		name: joi.string().required(),
	});

	const today = new Date();
	const time = today.toLocaleTimeString();

	const validation = userSchema.validate(req.body);
	if (validation.error) {
		console.log(validation);
		res.status(422).send('name deve ser string não vazia');
	} else if (validation.error) {
		console.log(validation.error);
	} else {
		try {
			const findName = await database
				.collection('participants')
				.findOne({ name });
			if (findName) {
				res.status(409).send('Nome já está sendo utilizado');
				return;
			}

			await database
				.collection('participants')
				.insertOne({ name, lastStatus: Date.now() });

			await database.collection('messages').insertOne({
				from: name,
				to: 'Todos',
				text: 'entra na sala...',
				type: 'status',
				time,
			});
			res.sendStatus(201);
		} catch (err) {
			res.status(500).send('erro');
		}
	}
});

app.get('/participants', async (req, res) => {
	try {
		const listParticipants = await database
			.collection('participants')
			.find({})
			.toArray();
		res.send(listParticipants);
	} catch (err) {
		res.status(500).send('erro');
	}
});

app.post('/messages', async (req, res) => {
	const { to, text, type } = req.body;
	const from = req.headers.user;

	const today = new Date();
	const time = today.toLocaleTimeString();

	const infoMessages = { to, text, type, from };

	const messagesSchema = joi.object({
		to: joi.string().required(),
		text: joi.string().required(),
		type: joi.string().valid('message', 'private_message').required(),
		from: joi.string().required(),
	});

	const validation = messagesSchema.validate(infoMessages);
	if (validation.error) {
		res.status(400).send(validation.error);
		console.log('error');
		return;
	} else {
		try {
			const fromUser = await database
				.collection('participants')
				.findOne({ name: from });
			if (fromUser) {
				const messages = await database
					.collection('messages')
					.insertOne({ to, from, text, type, time });
				res.sendStatus(201);
			} else {
				console.log('user not found on db');
				res.status(404).send('user not found on db');
			}
		} catch (err) {
			res.status(500).send(err);
			console.log(err);
		}
	}
});

app.get('/messages', async (req, res) => {
	try {
		const { limit } = req.query;

		const messages = await database
			.collection('messages')
			.find({})
			.toArray();
		if (limit) {
			let listMessages = messages.slice(-limit);
			res.status(201).send(listMessages);
		} else {
			res.status(201).send(messages);
		}
	} catch (err) {
		res.send(err);
		console.log(err);
	}
});

app.post('/status', async (req, res) => {
	const { user } = req.headers;
	console.log(user);
	try {
		const ifUser = await database
			.collection('participants')
			.findOneAndUpdate(
				{ name: user },
				{ $set: { lastStatus: Date.now() } }
			);
		console.log(ifUser);
		if (!ifUser) {
			res.sendStatus(404);
		} else {
			res.sendStatus(201);
		}
	} catch (err) {
		res.status(400).send(err);
	}
});

function checkUsersActived() {
	setInterval(async () => {
		const users = await database.collection('participants').find({});
		users.forEach(async (user) => {
			if (Date.now() - user.lastStatus >= 10000) {
				const deletedUser = await database
					.collection('participants')
					.deleteOne({ name: user.name });
				if (deletedUser.deletedCount === 1) {
					const deletedMessage = {
						from: user.name,
						to: 'Todos',
						text: 'sai da sala...',
						type: 'status',
						time: dayjs().format('HH:mm:ss'),
					};
					await database
						.collection('messages')
						.insertOne({ ...deletedMessage });
				} else {
					console.log('Não foi possivel deletar o usuário!');
				}
			}
		});
	}, 15000);
}
checkUsersActived();

app.delete('/messages/:ID_DA_MENSAGEM', async (req, res) => {
	const { user } = req.headers;
	const { ID_DA_MENSAGEM } = req.params;
	try {
		const usuario = await database
			.collection('messages')
			.findOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
		console.log(usuario);
		console.log(ID_DA_MENSAGEM);
		console.log(user);
		if (usuario.from === user) {
			await database
				.collection('messages')
				.deleteOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
			res.sendStatus(200);
		} else {
			res.sendStatus(401);
		}
	} catch (err) {
		console.log(err);
		res.sendStatus(404);
	}
});

app.put('/messages/:ID_DA_MENSAGEM', async (req, res) => {
	const { ID_DA_MENSAGEM } = req.params;
	const { to, text, type } = req.body;
	const from = req.headers.user;

	const infoMessages = { to, text, type, from };
	const messagesSchema = joi.object({
		to: joi.string().required(),
		text: joi.string().required(),
		type: joi.string().valid('message', 'private_message').required(),
		from: joi.string().required(),
	});

	const validation = messagesSchema.validate(infoMessages);
	if (validation.error) {
		res.status(400).send(validation.error);
		console.log('error');
		return;
	} else {
		console.log('success');
		try {
			const fromUser = await database
				.collection('participants')
				.findOne({ name: from });
			if (fromUser) {
				const messageUser = await database
					.collection('messages')
					.findOneAndUpdate(
						{ _id: new ObjectId(ID_DA_MENSAGEM) },
						{ $set: { text } }
					);
				res.sendStatus(200);
			} else {
				res.sendStatus(401);
			}
		} catch (err) {
			res.sendStatus(404);
			console.log(err);
		}
	}
});
