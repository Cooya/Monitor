import React from 'react';

import Message from './Message';

class EntriesList extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.colorAssociations = {
			error: '#ff3860',
			warning: '#ffdd57',
			info: '#23d160',
			notice: '#3273dc',
			debug: 'whitesmoke'
		};
	}

	render() {
		if (this.props.error) return <Message content={this.props.error} />;
		else {
			let header = null;
			let entries = null;

			if (this.props.entryType === 'logs')
				entries = this.props.entries.map((entry, index) => {
					return (
						<tr style={{backgroundColor: this.colorAssociations[entry.level]}} key={index}>
							<td>
								<b>{entry.timestamp.replace(/\..*Z/, '')}</b>
							</td>
							<td>
								<b>{entry.label}</b>
							</td>
							<td>{entry.message}</td>
						</tr>
					);
				});
			else if (this.props.entryType === 'logger')
				entries = this.props.entries.map((entry, index) => {
					return (
						<tr style={{backgroundColor: 'whitesmoke'}} key={index}>
							<td>
								<b>{entry.timestamp.replace(/\..*Z/, '')}</b>
							</td>
							<td>{entry.content.hostname}</td>
							<td>{entry.content.path}</td>
							<td>{entry.content.ip}</td>
							<td>{entry.content.user_agent}</td>
							<td>{entry.content.referer}</td>
						</tr>
					);
				});
			else if (this.props.entryType === 'stats' && this.props.entries.length) {
				header = (
					<thead>
						<tr>
							<th>Day</th>
							<th>Domain name</th>
							<th>Visitors</th>
							<th>Total requests</th>
							<th>Good requests</th>
							<th>Bad requests</th>
						</tr>
					</thead>
				);
				entries = this.props.entries.map((entry, index) => {
					return Object.keys(entry).map((key) => {
						if (key === '_id' || key === 'date') return null;
						return (
							<tr style={{backgroundColor: 'whitesmoke'}} key={index + '_' + key}>
								<td>
									<b>{entry.timestamp.replace(/T.*$/, '')}</b>
								</td>
								<td>{key.replace(/_/g, '.')}</td>
								<td>{entry[key].visitors}</td>
								<td>{entry[key].total_requests}</td>
								<td>{entry[key].total_requests - (entry[key].bad_requests || 0)}</td>
								<td>{entry[key].bad_requests || 0}</td>
							</tr>
						);
					});
				});
			}

			return (
				<table className='table'>
					{header}
					<tbody>{entries}</tbody>
				</table>
			);
		}
	}
}

export default EntriesList;
