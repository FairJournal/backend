CREATE TABLE images (
                        id INT AUTO_INCREMENT,
                        author_id INT NOT NULL,
                        signature VARCHAR(255) NOT NULL,
                        path VARCHAR(255) NOT NULL,
                        PRIMARY KEY (id),
                        FOREIGN KEY (author_id) REFERENCES users(id)
);
