import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
	console.log(chalk.bold.green('Server is running on port 5000'));
});

let database = null;
const mongocliente = new MongoClient('mongodb://127.0.0.1:27017/');

app.post('/participants', async (req, res) => {
	try {
		await mongocliente.connect();
		database = mongocliente.db('bate-papo-uol');
		console.log(chalk.bold.blue('Connected to database'));

		const { name } = req.body;
		const participant = await database
			.collection('participants')
			.insertOne({ name, lastStatus: Date.now() });
		res.sendStatus(201);
	} catch (err) {
		res.status(500).send('erro');
	} finally {
		mongocliente.close();
		console.log(chalk.bold.red('Disconnected to database.'));
	}
});

app.get('/participants', async (req, res) => {
	try {
		await mongocliente.connect();
		database = mongocliente.db('bate-papo-uol');
		console.log(chalk.bold.blue('Connected to database'));

		const listParticipants = await database
			.collection('participants')
			.find({})
			.toArray();
		res.send(listParticipants);
	} catch (err) {
		res.status(500).send('erro');
	} finally {
		mongocliente.close();
		console.log(chalk.bold.red('Disconnected to database.'));
	}
});

app.post('/messages', async (req, res) => {
	try {
		await mongocliente.connect();
		database = mongocliente.db('bate-papo-uol');
		console.log(chalk.bold.blue('Connected to database'));

		const { to, text, type } = req.body;
		const from = req.header.user;
		const today = new Date();
		const time = today.toLocaleTimeString();
		const messages = await database
			.collection('messages')
			.insertOne({ to, from, text, type, time });
		res.sendStatus(201);
	} catch (err) {
		res.status(500).send(err);
		console.log(err);
	} finally {
		mongocliente.close();
		console.log(chalk.bold.red('Disconnected to database'));
	}
});

app.get('/messages', async (req, res) => {
	try {
		await mongocliente.connect();
		database = mongocliente.db('bate-papo-uol');
		console.log(chalk.bold.blue('Connected to database'));

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
	} finally {
		mongocliente.close();
		console.log(chalk.bold.red('Disconnected to database'));
	}
});
